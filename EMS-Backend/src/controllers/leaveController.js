const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { Notification } = require('../models/System');
const { logAction } = require('../utils/auditLogger');

// @desc Apply for leave
// @route POST /api/leaves
exports.applyLeave = async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.companyId) query.company = req.companyId;
    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const { leaveType, startDate, endDate, reason, isHalfDay, halfDayType } = req.body;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) totalDays = 0.5;

    // Check leave balance
    if (leaveType !== 'unpaid' && leaveType !== 'other') {
      if (employee.leaveBalance[leaveType] < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} leave balance. Available: ${employee.leaveBalance[leaveType]}`
        });
      }
    }

    const leave = await Leave.create({
      employee: employee._id,
      user: req.user.id,
      company: req.companyId || req.user.company,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      isHalfDay,
      halfDayType,
      reason,
      attachment: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    // Create notification for manager/admin
    await Notification.create({
      company: req.companyId || req.user.company,
      user: req.user.id,
      title: 'New Leave Request',
      message: `${req.user.firstName} ${req.user.lastName} applied for ${leaveType} leave`,
      type: 'leave'
    });

    await logAction(req, 'CREATE', 'Leave', `Applied for ${leaveType} leave`, null, leave._id);
    res.status(201).json({ success: true, leave });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get all leaves
// @route GET /api/leaves
exports.getLeaves = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { status, leaveType, employee, startDate, endDate, page = 1, limit = 10 } = req.query;
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (employee) query.employee = employee;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    // Employee sees only own leaves
    if (req.user.role === 'employee') {
      const eQuery = { user: req.user.id };
      if (req.companyId) eQuery.company = req.companyId;
      const emp = await Employee.findOne(eQuery);
      if (emp) query.employee = emp._id;
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate({
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName avatar' }
      })
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: leaves.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      leaves
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Approve/Reject leave
// @route PUT /api/leaves/:id/status
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId }).populate('employee');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    if (rejectionReason) leave.rejectionReason = rejectionReason;
    await leave.save();

    // Update leave balance if approved
    if (status === 'approved' && leave.leaveType !== 'unpaid') {
      const employee = await Employee.findById(leave.employee._id);
      if (employee && employee.leaveBalance[leave.leaveType] !== undefined) {
        employee.leaveBalance[leave.leaveType] -= leave.totalDays;
        await employee.save();
      }
    }

    // Notify employee
    await Notification.create({
      company: leave.company,
      user: leave.user,
      title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your ${leave.leaveType} leave has been ${status}`,
      type: 'leave'
    });

    await logAction(req, 'STATUS_CHANGE', 'Leave', `Leave ${status} for ${leave.employee.user.firstName}`, null, leave._id);
    res.status(200).json({ success: true, leave });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get leave balance
// @route GET /api/leaves/balance
exports.getLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.query.employee || null;
    let employee;

    if (employeeId) {
      employee = await Employee.findOne({ _id: employeeId, company: req.companyId });
    } else {
      const eQuery = { user: req.user.id };
      if (req.companyId) eQuery.company = req.companyId;
      employee = await Employee.findOne(eQuery);
    }

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Get used leaves this year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);

    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          employee: employee._id,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const usedMap = {};
    usedLeaves.forEach(l => { usedMap[l._id] = l.totalDays; });

    const balance = {};
    Object.keys(employee.leaveBalance.toObject()).forEach(type => {
      balance[type] = {
        total: employee.leaveBalance[type],
        used: usedMap[type] || 0,
        remaining: employee.leaveBalance[type]
      };
    });

    res.status(200).json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Cancel leave
// @route PUT /api/leaves/:id/cancel
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, user: req.user.id });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status === 'approved') {
      // Restore leave balance
      const employee = await Employee.findById(leave.employee);
      if (employee && employee.leaveBalance[leave.leaveType] !== undefined) {
        employee.leaveBalance[leave.leaveType] += leave.totalDays;
        await employee.save();
      }
    }

    leave.status = 'cancelled';
    await leave.save();

    res.status(200).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update leave
// @route PUT /api/leaves/:id
exports.updateLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;
    let leave = await Leave.findOne({ _id: req.params.id, user: req.user.id });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be updated' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) totalDays = 0.5;

    // Check balance if type or days changed
    const employee = await Employee.findOne({ user: req.user.id, company: req.companyId });
    if (leaveType !== 'unpaid' && leaveType !== 'other') {
      if (employee.leaveBalance[leaveType] < totalDays) {
        return res.status(400).json({ success: false, message: 'Insufficient leave balance' });
      }
    }

    leave = await Leave.findByIdAndUpdate(req.params.id, {
      leaveType, startDate: start, endDate: end, totalDays, reason, isHalfDay
    }, { new: true });

    res.status(200).json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
