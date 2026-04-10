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
    if (!req.user) return;

    // Use req.companyId if set (by middleware or superadmin selector),
    // otherwise fall back to user's assigned company.
    const companyId = req.companyId || req.user.company || null;

    await AuditLog.create({
      company: companyId,
      user: req.user._id || req.user.id,
      action,
      resourceType,
      description,
      details,
      resourceId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  } catch (error) {
    console.error('AUDIT LOG FAILED:', error);
  }
};

module.exports = { logAction };
