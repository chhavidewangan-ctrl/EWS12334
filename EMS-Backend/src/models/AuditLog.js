const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'DOWNLOAD', 'STATUS_CHANGE', 'OTHER']
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['Employee', 'Client', 'Vendor', 'Invoice', 'Payroll', 'Inventory', 'Sale', 'Purchase', 'Leave', 'Attendance', 'Project', 'User', 'System']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed // Store old/new values or other metadata
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
