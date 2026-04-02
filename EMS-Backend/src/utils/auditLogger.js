const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {Object} req - The Express request object.
 * @param {string} action - The action type (e.g., 'CREATE', 'UPDATE').
 * @param {string} resourceType - The resource name (e.g., 'Employee').
 * @param {string} description - A user-friendly message.
 * @param {Object} [details] - Optional old/new values.
 * @param {string} [resourceId] - The ID of the target resource.
 */
const logAction = async (req, action, resourceType, description, details = null, resourceId = null) => {
  try {
    if (!req.user || !req.user.company) return;

    await AuditLog.create({
      company: req.user.company,
      user: req.user._id,
      action,
      resourceType,
      description,
      details,
      resourceId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('AUDIT LOG FAILED:', error);
  }
};

module.exports = { logAction };
