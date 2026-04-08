const mongoose = require('mongoose');

// Company Model
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: String,
  email: String,
  phone: String,
  website: String,
  gstNumber: String,
  panNumber: String,
  cinNumber: String,
  address: { street: String, city: String, state: String, country: String, pincode: String },
  industry: String,
  foundedYear: Number,
  employeeCount: { type: Number, default: 0 },
  settings: {
    workingDays: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    workingHoursStart: { type: String, default: '09:00' },
    workingHoursEnd: { type: String, default: '18:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    financialYearStart: { type: Number, default: 4 },
    lateMarkMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 4 }
  },
  smtpSettings: {
    host: String,
    port: Number,
    user: String,
    pass: String,
    fromEmail: String,
    fromName: String
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Branch Model
const branchSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  code: String,
  email: String,
  phone: String,
  address: { street: String, city: String, state: String, country: String, pincode: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  isHeadOffice: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Role Model
const roleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: String,
  permissions: [String],
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Notification Model
const notificationSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: String,
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'leave', 'attendance', 'payroll', 'task', 'announcement'],
    default: 'info'
  },
  link: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Document Model
const documentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  name: { type: String, required: true },
  type: { type: String, enum: ['joining_letter', 'experience_letter', 'id_card', 'payslip', 'offer_letter', 'contract', 'other'] },
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  isShared: { type: Boolean, default: false }
}, { timestamps: true });

// Ticket Model
const ticketSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  ticketNumber: { type: String, unique: true },
  title: { type: String, required: true },
  description: String,
  category: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    attachment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  closedAt: Date,
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Announcement Model
const announcementSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  content: String,
  type: { type: String, enum: ['general', 'important', 'urgent', 'event', 'policy'], default: 'general' },
  targetRoles: [String],
  targetBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  attachments: [{ name: String, url: String }],
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Holiday Model
const holidaySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['public', 'company', 'optional'], default: 'public' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);
const Branch = mongoose.model('Branch', branchSchema);
const Role = mongoose.model('Role', roleSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Document = mongoose.model('Document', documentSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);
const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = { Company, Branch, Role, Notification, Document, Ticket, Announcement, Holiday };
