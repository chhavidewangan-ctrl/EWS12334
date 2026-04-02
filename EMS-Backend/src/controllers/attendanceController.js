const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// @desc Check in
// @route POST /api/attendance/checkin
exports.checkIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { user: req.user.id };
    if (req.companyId) query.company = req.companyId;
    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const existing = await Attendance.findOne({ employee: employee._id, date: today });
    if (existing && existing.checkIn) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    const now = new Date();
    const workStart = new Date(today);
    workStart.setHours(9, 0, 0, 0);
    const lateMinutes = now > workStart ? Math.floor((now - workStart) / 60000) : 0;
    const status = lateMinutes > 15 ? 'late' : 'present';

    const attendance = existing
      ? await Attendance.findByIdAndUpdate(existing._id, {
          checkIn: now, status, lateMinutes,
          checkInLocation: req.body.location || {},
          checkInDevice: req.body.deviceInfo
        }, { new: true })
      : await Attendance.create({
          employee: employee._id,
          user: req.user.id,
          company: employee.company,
          date: today,
          checkIn: now,
          status,
          lateMinutes,
          checkInLocation: req.body.location || {},
          checkInDevice: req.body.deviceInfo
        });

    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Check out
// @route POST /api/attendance/checkout
exports.checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { user: req.user.id };
    if (req.companyId) query.company = req.companyId;
    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const attendance = await Attendance.findOne({ employee: employee._id, date: today });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ success: false, message: 'Please check in first' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out' });
    }

    const now = new Date();
    const workingHours = (now - attendance.checkIn) / (1000 * 60 * 60);
    const overtime = Math.max(0, workingHours - 8);

    if (workingHours < 4) {
      attendance.status = 'half_day';
    }

    attendance.checkOut = now;
    attendance.workingHours = parseFloat(workingHours.toFixed(2));
    attendance.overtime = parseFloat(overtime.toFixed(2));
    attendance.checkOutLocation = req.body.location || {};
    attendance.checkOutDevice = req.body.deviceInfo;
    await attendance.save();

    res.status(200).json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get attendance records
// @route GET /api/attendance
exports.getAttendance = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { employee, date, startDate, endDate, status, page = 1, limit = 30 } = req.query;

    if (employee) query.employee = employee;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      query.date = d;
    }
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) query.status = status;

    // For employee role, show only own attendance
    if (req.user.role === 'employee') {
      const eQuery = { user: req.user.id };
      if (req.companyId) eQuery.company = req.companyId;
      const emp = await Employee.findOne(eQuery);
      if (emp) query.employee = emp._id;
    }

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName avatar' }
      })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: attendance.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Mark attendance (admin)
// @route POST /api/attendance/mark
exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, notes } = req.body;

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ employee: employeeId, date: d });

    if (existing) {
      existing.status = status;
      if (checkIn) existing.checkIn = new Date(checkIn);
      if (checkOut) existing.checkOut = new Date(checkOut);
      existing.notes = notes;
      existing.isManualEntry = true;
      existing.approvedBy = req.user.id;
      await existing.save();
      return res.status(200).json({ success: true, attendance: existing });
    }

    const employee = await Employee.findById(employeeId);

    const attendance = await Attendance.create({
      employee: employeeId,
      user: employee.user,
      company: req.companyId || employee.company,
      date: d,
      status,
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      notes,
      isManualEntry: true,
      approvedBy: req.user.id
    });

    res.status(201).json({ success: true, attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get today's attendance summary
// @route GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { date: today };
    if (req.companyId) query.company = req.companyId;

    const present = await Attendance.countDocuments({ ...query, status: { $in: ['present', 'late'] } });
    const absent = await Attendance.countDocuments({ ...query, status: 'absent' });
    const late = await Attendance.countDocuments({ ...query, status: 'late' });
    const halfDay = await Attendance.countDocuments({ ...query, status: 'half_day' });
    const onLeave = await Attendance.countDocuments({ ...query, status: 'on_leave' });

    const empQuery = { status: 'active' };
    if (req.companyId) empQuery.company = req.companyId;

    const totalEmployees = await Employee.countDocuments(empQuery);

    res.status(200).json({
      success: true,
      stats: { totalEmployees, present, absent, late, halfDay, onLeave }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get my attendance today
// @route GET /api/attendance/my-today
exports.getMyTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const attendance = await Attendance.findOne({ employee: employee._id, date: today });

    res.status(200).json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
