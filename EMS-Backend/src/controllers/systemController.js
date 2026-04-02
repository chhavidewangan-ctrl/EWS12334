const { Company, Branch, Notification, Announcement, Ticket, Holiday, Document } = require('../models/System');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../utils/auditLogger');

// ---- COMPANY ----
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, companies });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id || req.user.company);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, company });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, company });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id || req.user.company, req.body, { new: true });
    res.status(200).json({ success: true, company });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- BRANCHES ----
exports.getBranches = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    const branches = await Branch.find(query).populate({ path: 'manager', populate: { path: 'user', select: 'firstName lastName' } });
    res.status(200).json({ success: true, branches });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create({
      ...req.body,
      company: req.companyId || req.body.company || req.user.company
    });
    res.status(201).json({ success: true, branch });
  } catch (error) {
    console.error('Create Branch Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, req.body, { new: true });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Branch', `Updated branch: ${branch.name}`, null, branch._id);
    res.status(200).json({ success: true, branch });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found or unauthorized' });
    await logAction(req, 'DELETE', 'Branch', `Deleted branch: ${branch.name}`, null, branch._id);
    res.status(200).json({ success: true, message: 'Branch deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- NOTIFICATIONS ----
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.markAsRead = async (req, res) => {
  try {
    if (req.params.id === 'all') {
      await Notification.updateMany({ user: req.user.id }, { isRead: true, readAt: new Date() });
    } else {
      await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    }
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- DIRECT MESSAGES ----
exports.sendDirectMessage = async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    if (!userId || !title) return res.status(400).json({ success: false, message: 'Recipient and title are required' });

    const notification = await Notification.create({
      company: req.companyId || req.user.company,
      user: userId,
      title,
      message,
      type: 'info',
      sender: req.user.id
    });

    res.status(201).json({ success: true, notification });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        _id: notification._id,
        title,
        message,
        type: 'info',
        sender: req.user.firstName + ' ' + req.user.lastName,
        createdAt: notification.createdAt
      });
    }
  } catch (error) {
    console.error('Send Direct Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---- ANNOUNCEMENTS ----
exports.getAnnouncements = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.companyId) query.company = req.companyId;

    // Filter by role unless superadmin
    if (req.user.role !== 'superadmin') {
      query.targetRoles = { $in: ['all', req.user.role] };
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, announcements });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, targetAudience, publishDate, expiryDate } = req.body;
    const companyId = req.companyId || req.body.company || req.user.company;

    if (!companyId) {
      console.error('Create Announcement Error: No company ID found');
      return res.status(400).json({ success: false, message: 'No company context found. Please ensure your account belongs to a company.' });
    }

    let targetRoles = ['all'];
    if (Array.isArray(targetAudience) && targetAudience.length > 0) {
      targetRoles = targetAudience;
    } else if (typeof targetAudience === 'string') {
      targetRoles = [targetAudience];
    }

    let announcement = await Announcement.create({
      title,
      content,
      type: type || 'general',
      company: companyId,
      createdBy: req.user.id,
      startDate: publishDate || new Date(),
      endDate: expiryDate,
      targetRoles,
      isActive: true
    });

    announcement = await announcement.populate('createdBy', 'firstName lastName');
    await logAction(req, 'CREATE', 'Announcement', `Posted announcement: ${title}`, null, announcement._id);
    res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('Create Announcement Detailed Error:', JSON.stringify(error, null, 2));
    res.status(500).json({ success: false, message: 'Server error', details: error.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, req.body, { new: true });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Announcement', `Updated announcement: ${announcement.title}`, null, announcement._id);
    res.status(200).json({ success: true, announcement });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found or unauthorized' });
    await logAction(req, 'DELETE', 'Announcement', `Deleted announcement: ${announcement.title}`, null, announcement._id);
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- TICKETS ----
exports.getTickets = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.user.role === 'employee') query.createdBy = req.user.id;
    if (req.query.status) query.status = req.query.status;
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, tickets });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    const companyId = req.companyId || req.body.company || req.user.company;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const count = await Ticket.countDocuments({ company: companyId });
    const ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
    let ticket = await Ticket.create({
      title: subject,
      description,
      category,
      priority,
      ticketNumber,
      company: companyId,
      createdBy: req.user.id
    });
    ticket = await ticket.populate('createdBy', 'firstName lastName');
    await logAction(req, 'CREATE', 'Ticket', `Created ticket: ${ticketNumber}`, null, ticket._id);
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('Create Ticket Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, req.body, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Ticket', `Updated ticket status: ${ticket.title}`, null, ticket._id);
    res.status(200).json({ success: true, ticket });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.replyTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, company: req.companyId });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
    ticket.replies.push({ user: req.user.id, message: req.body.message });
    await ticket.save();
    await logAction(req, 'UPDATE', 'Ticket', `Replied to ticket: ${ticket.title}`, null, ticket._id);
    res.status(200).json({ success: true, ticket });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- HOLIDAYS ----
exports.getHolidays = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.status(200).json({ success: true, holidays });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create({
      ...req.body,
      company: req.companyId || req.body.company || req.user.company
    });
    await logAction(req, 'CREATE', 'Holiday', `Created holiday: ${holiday.name}`, null, holiday._id);
    res.status(201).json({ success: true, holiday });
  } catch (error) {
    console.error('Create Holiday Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found or unauthorized' });
    await logAction(req, 'DELETE', 'Holiday', `Deleted holiday: ${holiday.name}`, null, holiday._id);
    res.status(200).json({ success: true, message: 'Holiday deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- AUDIT LOGS ----
exports.getAuditLogs = async (req, res) => {
  try {
    const query = {};
    const { company, user, action, resource, startDate, endDate, month, year, page = 1, limit = 20 } = req.query;

    // SaaS Logic: 
    // 1. If user is a company-level admin, ONLY show their company's logs
    // 2. If user is a platform-level admin, show 'company' from query if provided, else show ALL logs
    if (req.companyId) {
      query.company = req.companyId;
    } else if (company) {
      query.company = company;
    }

    if (user) query.user = user;
    if (action) query.action = action;
    if (resource) query.resourceType = resource;
    
    // Date range logic
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      query.createdAt = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59)
      };
    } else if (year) {
      const y = parseInt(year);
      query.createdAt = {
        $gte: new Date(y, 0, 1),
        $lte: new Date(y, 11, 31, 23, 59, 59)
      };
    } else if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email role')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      logs
    });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
