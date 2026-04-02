const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { logAction } = require('../utils/auditLogger');

// @desc Generate payroll
// @route POST /api/payroll/generate
exports.generatePayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;

    let employees;
    if (employeeId) {
      const emp = await Employee.findOne({ _id: employeeId, company: req.companyId });
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found or unauthorized' });
      employees = [emp];
    } else {
      const query = { status: 'active' };
      if (req.companyId) query.company = req.companyId;
      employees = await Employee.find(query);
    }

    const payrolls = [];

    for (const employee of employees) {
      // Check if already generated
      const existing = await Payroll.findOne({ employee: employee._id, month, year });
      if (existing) continue;

      // Get attendance for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const totalDaysInMonth = endDate.getDate();

      const attendanceRecords = await Attendance.find({
        employee: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const attendanceSummary = {
        totalDays: totalDaysInMonth,
        presentDays: attendanceRecords.filter(a => ['present', 'late'].includes(a.status)).length,
        absentDays: attendanceRecords.filter(a => a.status === 'absent').length,
        halfDays: attendanceRecords.filter(a => a.status === 'half_day').length,
        lateDays: attendanceRecords.filter(a => a.status === 'late').length,
        leaveDays: attendanceRecords.filter(a => a.status === 'on_leave').length,
        holidays: attendanceRecords.filter(a => a.status === 'holiday').length,
        weekends: attendanceRecords.filter(a => a.status === 'weekend').length,
        overtimeHours: attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0)
      };

      const salary = employee.salaryInfo || {};
      const workingDays = totalDaysInMonth - attendanceSummary.weekends - attendanceSummary.holidays;
      const payableDays = attendanceSummary.presentDays + attendanceSummary.leaveDays + (attendanceSummary.halfDays * 0.5);
      
      // If no attendance records at all, assume full pay for draft
      let ratio = 1;
      if (attendanceRecords.length > 0) {
        ratio = workingDays > 0 ? payableDays / workingDays : 1;
      }

      // For draft, show full earnings, deduct via Loss of Pay
      const earnings = {
        basicSalary: salary.basicSalary || 0,
        hra: salary.hra || 0,
        da: salary.da || 0,
        specialAllowance: salary.specialAllowance || 0,
        medicalAllowance: salary.medicalAllowance || 0,
        travelAllowance: salary.travelAllowance || 0,
        bonus: 0,
        overtime: 0,
        otherEarnings: 0
      };

      const totalEarnings = Object.values(earnings).reduce((a, b) => a + b, 0);

      const deductions = {
        pfEmployee: salary.pfEmployee || 0,
        pfEmployer: salary.pfEmployer || 0,
        esiEmployee: salary.esiEmployee || 0,
        esiEmployer: salary.esiEmployer || 0,
        professionalTax: salary.professionalTax || 0,
        tds: salary.tds || 0,
        loanDeduction: 0,
        otherDeductions: 0,
        lossOfPay: 0
      };

      const lossDays = workingDays - payableDays;
      if (attendanceRecords.length > 0 && lossDays > 0 && workingDays > 0) {
        // Only deduct if there is actual attendance data
        deductions.lossOfPay = Math.round(((salary.basicSalary || 0) / workingDays) * lossDays);
      }

      const totalDeductions = deductions.pfEmployee + deductions.esiEmployee +
        deductions.professionalTax + deductions.tds + deductions.loanDeduction +
        deductions.otherDeductions + deductions.lossOfPay;

      const netSalary = Math.max(0, totalEarnings - totalDeductions);
      const grossSalary = totalEarnings;

      const payroll = await Payroll.findOneAndUpdate(
        { employee: employee._id, month, year },
        {
          user: employee.user,
          company: employee.company,
          earnings,
          deductions,
          attendanceSummary,
          totalEarnings,
          totalDeductions,
          netSalary,
          grossSalary,
          processedBy: req.user.id,
          status: 'draft'
        },
        { upsert: true, new: true }
      );

      payrolls.push(payroll);
    }

    await logAction(req, 'CREATE', 'Payroll', `Generated payroll for ${month}/${year} (${payrolls.length} employees)`);

    res.status(201).json({
      success: true,
      count: payrolls.length,
      payrolls
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get payrolls
// @route GET /api/payroll
exports.getPayrolls = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    const { month, year, employee, status, page = 1, limit = 10 } = req.query;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (employee) query.employee = employee;
    if (status) query.status = status;

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user.id });
      if (emp) query.employee = emp._id;
    }

    const total = await Payroll.countDocuments(query);
    const payrolls = await Payroll.find(query)
      .populate({
        path: 'employee',
        populate: { path: 'user', select: 'firstName lastName email avatar' }
      })
      .sort({ year: -1, month: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: payrolls.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      payrolls
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get payroll by ID
// @route GET /api/payroll/:id
exports.getPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, company: req.companyId })
      .populate({
        path: 'employee',
        populate: [
          { path: 'user', select: 'firstName lastName email avatar' },
          { path: 'company', select: 'name address' }
        ]
      });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found or unauthorized' });
    }

    res.status(200).json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update payroll status
// @route PUT /api/payroll/:id/status
exports.updatePayrollStatus = async (req, res) => {
  try {
    const { status, paymentMode, transactionId, paidDate } = req.body;
    const payroll = await Payroll.findOne({ _id: req.params.id, company: req.companyId });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found or unauthorized' });
    }

    payroll.status = status;
    if (status === 'approved') payroll.approvedBy = req.user.id;
    if (status === 'paid') {
      payroll.paidDate = paidDate || new Date();
      payroll.paymentMode = paymentMode;
      payroll.transactionId = transactionId;
    }
    await payroll.save();
    
    await logAction(req, 'UPDATE', 'Payroll', `Updated payroll status to ${status} for ${payroll._id}`, null, payroll._id);

    res.status(200).json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get salary report
// @route GET /api/payroll/report
exports.getSalaryReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const report = await Payroll.aggregate([
      { $match: query },
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' },
          totalPF: { $sum: { $add: ['$deductions.pfEmployee', '$deductions.pfEmployer'] } },
          totalESI: { $sum: { $add: ['$deductions.esiEmployee', '$deductions.esiEmployer'] } },
          count: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
