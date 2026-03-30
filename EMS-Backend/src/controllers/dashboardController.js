const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const { Project, Task } = require('../models/Project');
const { Invoice, Expense, Sales } = require('../models/ERP');
const { Announcement } = require('../models/System');

// @desc Get dashboard overview
// @route GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user.id });
      if (!emp) return res.status(404).json({ success: false, message: 'Employee profile not found' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Personal Attendance
      const myAttendanceToday = await Attendance.findOne({ employee: emp._id, date: today });
      
      // Personal Leaves
      const myLeaves = await Leave.find({ employee: emp._id }).sort({ createdAt: -1 }).limit(5);

      // Personal Tasks
      const myTasks = await Task.find({ assignedTo: emp._id, status: { $ne: 'completed' } })
        .populate('project', 'name')
        .sort({ deadline: 1 }).limit(5);

      // Announcements
      const announcements = await Announcement.find({ 
        company: req.companyId,
        isActive: true,
        targetRoles: { $in: ['all', 'employee'] }
      }).populate('createdBy', 'firstName lastName').sort({ createdAt: -1 }).limit(5);

      // Attendance Trend (Personal)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const att = await Attendance.findOne({ employee: emp._id, date: d });
        last7Days.push({ date: d.toISOString().split('T')[0], status: att ? att.status : 'absent' });
      }

      return res.status(200).json({
        success: true,
        dashboard: {
          role: 'employee',
          employee: emp,
          attendanceToday: myAttendanceToday,
          leaves: myLeaves,
          tasks: myTasks,
          announcements,
          attendanceTrend: last7Days,
          leaveBalance: emp.leaveBalance || { casual: 0, sick: 0, earned: 0 }
        }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    // Employee stats
    const totalEmployees = await Employee.countDocuments({ ...query, status: 'active' });
    const newEmployees = await Employee.countDocuments({
      ...query, status: 'active',
      joiningDate: { $gte: monthStart, $lte: monthEnd }
    });

    // Today's attendance
    const todayAttendance = await Attendance.countDocuments({
      ...query, date: today, status: { $in: ['present', 'late'] }
    });
    const todayAbsent = totalEmployees - todayAttendance;
    const todayLate = await Attendance.countDocuments({ ...query, date: today, status: 'late' });

    // Leave stats
    const pendingLeaves = await Leave.countDocuments({ ...query, status: 'pending' });
    const todayOnLeave = await Leave.countDocuments({
      ...query, status: 'approved',
      startDate: { $lte: today }, endDate: { $gte: today }
    });

    // Payroll stats
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyPayroll = await Payroll.aggregate([
      { $match: { ...query, month: currentMonth, year: currentYear } },
      { $group: { _id: null, total: { $sum: '$netSalary' }, paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$netSalary', 0] } } } }
    ]);

    // Project stats
    const activeProjects = await Project.countDocuments({ ...query, status: 'active' });
    const pendingTasks = await Task.countDocuments({ ...query, status: { $in: ['todo', 'in_progress'] } });
    const completedTasks = await Task.countDocuments({ ...query, status: 'completed' });

    // Financial stats
    const totalSalesYear = await Sales.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalExpensesYear = await Expense.aggregate([
      { $match: { ...query, date: { $gte: yearStart }, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalSales = totalSalesYear[0]?.total || 0;
    const totalExpenses = totalExpensesYear[0]?.total || 0;

    // Monthly revenue chart data
    const monthlyRevenue = await Sales.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyExpenseChart = await Expense.aggregate([
      { $match: { ...query, date: { $gte: yearStart }, status: 'approved' } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Attendance trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const count = await Attendance.countDocuments({
        ...query, date: d, status: { $in: ['present', 'late'] }
      });
      last7Days.push({ date: d.toISOString().split('T')[0], present: count });
    }

    // Department distribution
    const departmentDistribution = await Employee.aggregate([
      { $match: { ...query, status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent activities
    const recentLeaves = await Leave.find(query)
      .populate({ path: 'employee', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ createdAt: -1 }).limit(5);

    const recentTasks = await Task.find(query)
      .populate({ path: 'assignedTo', populate: { path: 'user', select: 'firstName lastName' } })
      .sort({ updatedAt: -1 }).limit(5);

    // Pending invoices
    const pendingInvoices = await Invoice.countDocuments({ ...query, status: { $in: ['sent', 'overdue'] } });
    const overdueInvoices = await Invoice.countDocuments({ ...query, status: 'overdue' });

    res.status(200).json({
      success: true,
      dashboard: {
        employees: { total: totalEmployees, new: newEmployees },
        attendance: { present: todayAttendance, absent: todayAbsent, late: todayLate, onLeave: todayOnLeave },
        leaves: { pending: pendingLeaves, onLeave: todayOnLeave },
        payroll: { totalSalary: monthlyPayroll[0]?.total || 0, paid: monthlyPayroll[0]?.paid || 0 },
        projects: { active: activeProjects, pendingTasks, completedTasks },
        financial: { totalSales, totalExpenses, profit: totalSales - totalExpenses },
        invoices: { pending: pendingInvoices, overdue: overdueInvoices },
        charts: {
          monthlyRevenue: monthlyRevenue.map(m => ({ month: m._id, amount: m.total })),
          monthlyExpenses: monthlyExpenseChart.map(m => ({ month: m._id, amount: m.total })),
          attendanceTrend: last7Days,
          departmentDistribution: departmentDistribution.map(d => ({ department: d._id, count: d.count }))
        },
        recentActivities: { recentLeaves, recentTasks }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get reports
// @route GET /api/reports/:type
exports.getReport = async (req, res) => {
  try {
    const { type } = req.params;
    const query = {};
    if (req.companyId) query.company = req.companyId;
    const { startDate, endDate, month, year } = req.query;

    let report;

    switch (type) {
      case 'employee':
        report = await Employee.aggregate([
          { $match: { ...query } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);
        const byDepartment = await Employee.aggregate([
          { $match: { ...query, status: 'active' } },
          { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);
        report = { statusWise: report, departmentWise: byDepartment };
        break;

      case 'attendance':
        const attQuery = { ...query };
        if (startDate && endDate) attQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        report = await Attendance.aggregate([
          { $match: attQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        break;

      case 'salary':
        const salQuery = { ...query };
        if (month) salQuery.month = parseInt(month);
        if (year) salQuery.year = parseInt(year);
        report = await Payroll.aggregate([
          { $match: salQuery },
          {
            $group: {
              _id: null,
              totalGross: { $sum: '$grossSalary' },
              totalDeductions: { $sum: '$totalDeductions' },
              totalNet: { $sum: '$netSalary' },
              totalPF: { $sum: { $add: ['$deductions.pfEmployee', '$deductions.pfEmployer'] } },
              totalESI: { $sum: { $add: ['$deductions.esiEmployee', '$deductions.esiEmployer'] } },
              count: { $sum: 1 }
            }
          }
        ]);
        break;

      case 'sales':
        const salesQuery = { ...query };
        if (startDate && endDate) salesQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        report = await Sales.aggregate([
          { $match: salesQuery },
          {
            $group: {
              _id: { $month: '$date' },
              total: { $sum: '$total' },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;

      case 'expense':
        const expQuery = { ...query };
        if (startDate && endDate) expQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        report = await Expense.aggregate([
          { $match: expQuery },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } }
        ]);
        break;

      case 'profit_loss':
        const plQuery = { ...query };
        const plYear = year ? parseInt(year) : new Date().getFullYear();
        const plStart = new Date(plYear, 0, 1);
        const plEnd = new Date(plYear, 11, 31);

        const salesTotal = await Sales.aggregate([
          { $match: { ...plQuery, date: { $gte: plStart, $lte: plEnd } } },
          { $group: { _id: { $month: '$date' }, revenue: { $sum: '$total' } } },
          { $sort: { _id: 1 } }
        ]);

        const expenseTotal = await Expense.aggregate([
          { $match: { ...plQuery, date: { $gte: plStart, $lte: plEnd }, status: 'approved' } },
          { $group: { _id: { $month: '$date' }, expense: { $sum: '$amount' } } },
          { $sort: { _id: 1 } }
        ]);

        const salaryTotal = await Payroll.aggregate([
          { $match: { ...plQuery, year: plYear, status: 'paid' } },
          { $group: { _id: '$month', salary: { $sum: '$netSalary' } } },
          { $sort: { _id: 1 } }
        ]);

        report = { revenue: salesTotal, expenses: expenseTotal, salaries: salaryTotal, year: plYear };
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
