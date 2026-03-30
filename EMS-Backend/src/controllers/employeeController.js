const Employee = require('../models/Employee');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');
const { Company, Notification } = require('../models/System');

// @desc Get all employees
// @route GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { department, status, search, page = 1, limit = 10 } = req.query;
    if (department) query.department = department;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('user', 'firstName lastName email phone avatar role isActive')
      .populate('branch', 'name')
      .populate('reportingManager', 'employeeId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: employees.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get single employee
// @route GET /api/employees/:id
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'firstName lastName email phone avatar role isActive lastLogin')
      .populate('company', 'name')
      .populate('branch', 'name')
      .populate({
        path: 'reportingManager',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Create employee
// @route POST /api/employees
exports.createEmployee = async (req, res) => {
  let user = null;
  try {
    const {
      email, password, firstName, lastName, role,
      employeeId, department, designation, joiningDate,
      employmentType, personalInfo, contactInfo, bankDetails,
      documents, salaryInfo, branch, company: bodyCompany
    } = req.body;

    // --- ROBUST COMPANY DETECTION ---
    // Try middleware ID -> Body ID -> Current User's Company
    let company = req.companyId || bodyCompany || (req.user && req.user.company);

    // Final fallback for Admin/SuperAdmin: Find the first company in the database
    if (!company && (req.user?.role === 'superadmin' || req.user?.role === 'admin' || !req.user)) {
      const fallbackCompany = await Company.findOne();
      if (fallbackCompany) company = fallbackCompany._id;
    }

    // --- USER CREATION ---
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';

    user = await User.create({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      firstName: (firstName || 'Unnamed').trim(),
      lastName: (lastName || '').trim(),
      role: role || 'employee',
      company,
      branch
    });

    // --- ROLE LOGIC: Only create Employee record for non-admin roles ---
    const isEmployeeRole = !['superadmin', 'admin'].includes(user.role);

    if (isEmployeeRole) {
      try {
        if (!company) {
          // If company is STILL not found, throw error to trigger cleanup
          throw new Error('Company is required to create an employee record. Please ensure at least one company exists.');
        }

        const employee = await Employee.create({
          user: user._id,
          company,
          branch,
          employeeId: employeeId || `EMP-${Date.now()}`,
          department: department || 'General',
          designation: designation || 'Staff',
          joiningDate: (joiningDate && joiningDate !== "") ? joiningDate : new Date(),
          employmentType,
          personalInfo,
          contactInfo,
          bankDetails,
          documents,
          salaryInfo
        });

        // Link employee to user
        user.employee = employee._id;
        await user.save({ validateBeforeSave: false });

        // Populate for response
        const populatedEmployee = await Employee.findById(employee._id)
          .populate('user', 'firstName lastName email phone avatar role');

        // Welcome email
        const template = emailTemplates.welcomeEmail(firstName, email, tempPassword);
        sendEmail({ email, subject: template.subject, html: template.html });

        return res.status(201).json({ success: true, employee: populatedEmployee });
      } catch (employeeError) {
        // CLEANUP: Delete user if employee creation fails
        if (user) await User.findByIdAndDelete(user._id);
        throw employeeError;
      }
    } else {
      // For Admins/SuperAdmins: No employee record needed
      const template = emailTemplates.welcomeEmail(firstName, email, tempPassword);
      sendEmail({ email, subject: template.subject, html: template.html });

      return res.status(201).json({
        success: true,
        message: 'Administrator created successfully',
        user: { id: user._id, email: user.email, role: user.role }
      });
    }
  } catch (error) {
    console.error('Create worker error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc Update employee
// @route PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    let employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Update user info if provided
    if (req.body.firstName || req.body.lastName || req.body.phone || req.body.role) {
      await User.findByIdAndUpdate(employee.user, {
        ...(req.body.firstName && { firstName: req.body.firstName }),
        ...(req.body.lastName && { lastName: req.body.lastName }),
        ...(req.body.phone && { phone: req.body.phone }),
        ...(req.body.role && { role: req.body.role })
      });
    }

    const oldStatus = employee.status;

    employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'firstName lastName email phone avatar role');

    // Create notification only for the employee who is put 'on_notice'
    if (req.body.status === 'on_notice' && oldStatus !== 'on_notice') {
      try {
        await Notification.create({
          company: employee.company,
          user: employee.user._id || employee.user,
          title: 'Status Update: On Notice Period',
          message: `Your employment status has been updated to 'On Notice'. Please contact HR for further details.`,
          type: 'warning',
          sender: req.user.id
        });
      } catch (notifErr) {
        console.error('Failed to create notice notification:', notifErr);
      }
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Delete employee
// @route DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Deactivate user account
    await User.findByIdAndUpdate(employee.user, { isActive: false });
    employee.status = 'terminated';
    await employee.save();

    res.status(200).json({ success: true, message: 'Employee deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Upload employee document
// @route POST /api/employees/:id/documents
exports.uploadDocument = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    employee.uploadedDocuments.push({
      name: req.body.name || req.file.originalname,
      type: req.body.type || 'other',
      url: `/uploads/${req.file.filename}`
    });

    await employee.save();

    res.status(200).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get employee stats
// @route GET /api/employees/stats
exports.getEmployeeStats = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const total = await Employee.countDocuments({ ...query });
    const active = await Employee.countDocuments({ ...query, status: 'active' });
    const onNotice = await Employee.countDocuments({ ...query, status: 'on_notice' });
    const inactive = await Employee.countDocuments({ ...query, status: { $in: ['inactive', 'terminated', 'resigned'] } });

    const departmentStats = await Employee.aggregate([
      { $match: { ...query, status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: { total, active, onNotice, inactive, departmentStats }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
