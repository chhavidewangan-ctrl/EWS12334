const Employee = require('../models/Employee');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');
const { Company, Notification } = require('../models/System');
const { logAction } = require('../utils/auditLogger');

// @desc Get all employees
// @route GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) {
      query.company = req.companyId;
    } else if (req.user.role !== 'superadmin') {
      // If not superadmin and no companyId, return empty list
      return res.status(200).json({ success: true, count: 0, total: 0, employees: [] });
    }

    const { department, status, search, company: queryCompany, page = 1, limit = 10 } = req.query;
    
    // If superadmin chooses a specific company
    if (queryCompany && req.user.role === 'superadmin') {
      query.company = queryCompany;
    }

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
      .populate('company', 'name')
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
    const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId })
      .populate('user', 'firstName lastName email phone avatar role isActive lastLogin')
      .populate('company', 'name')
      .populate('branch', 'name')
      .populate({
        path: 'reportingManager',
        populate: { path: 'user', select: 'firstName lastName' }
      });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
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

        await logAction(req, 'CREATE', 'Employee', `Created employee ${firstName} ${lastName} (${employeeId})`, req.body, employee._id);

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
      await logAction(req, 'CREATE', 'User', `Created administrator ${firstName} ${lastName} (${user.role})`, { role: user.role, email: user.email }, user._id);
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
    let employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
    }

    const { 
      firstName, lastName, phone, role, email,
      ...employeeData 
    } = req.body;

    // Remove immutable or problematic fields
    delete employeeData.user;
    delete employeeData.company;
    delete employeeData._id;
    delete employeeData.__v;

    // Update user info if provided
    if (firstName || lastName || phone || role || email) {
      await User.findByIdAndUpdate(employee.user, {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(email && { email: email.toLowerCase().trim() })
      });
    }

    const oldStatus = employee.status;

    employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: employeeData },
      {
        new: true,
        runValidators: true
      }
    ).populate('user', 'firstName lastName email phone avatar role');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
    }

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

    await logAction(req, 'UPDATE', 'Employee', `Updated employee profile for ${employee.user.firstName} ${employee.user.lastName}`, req.body, employee._id);

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
    const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
    }

    // Delete associated user account
    if (employee.user) {
      await User.findOneAndDelete({ _id: employee.user, company: req.companyId });
    }

    // Delete the employee record
    await Employee.findOneAndDelete({ _id: req.params.id, company: req.companyId });

    await logAction(req, 'DELETE', 'Employee', `Deleted employee record and user account for ID: ${req.params.id}`, { employeeId: req.params.id, userId: employee.user });

    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Upload employee document
// @route POST /api/employees/:id/documents
exports.uploadDocument = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    
    if (req.body.type === 'profile_photo') {
      console.log(`Setting profile photo for employee ${employee._id}, user: ${employee.user}`);
      employee.profilePhoto = photoUrl;
      if (employee.user) {
        const updatedUser = await User.findByIdAndUpdate(employee.user, { avatar: photoUrl }, { new: true });
        console.log('User avatar updated:', updatedUser?.avatar);
      }
    } else {
      employee.uploadedDocuments.push({
        name: req.body.name || req.file.originalname,
        type: req.body.type || 'other',
        url: photoUrl
      });
    }

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
