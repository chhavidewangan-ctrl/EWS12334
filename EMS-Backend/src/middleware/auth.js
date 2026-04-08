const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Role authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Company check middleware
exports.companyCheck = (req, res, next) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const isAdminRole = ['superadmin', 'admin'].includes(req.user.role);

  if (!isAdminRole && !req.user.company) {
    return res.status(403).json({ success: false, message: 'No company assigned to this employee' });
  }

  // Set companyId for scoping
  // Superadmin can override companyId via header to view data of other companies
  if (isSuperAdmin && req.headers['x-company-id']) {
    req.companyId = req.headers['x-company-id'];
  } else if (req.user.company) {
    req.companyId = req.user.company;
  }
  
  next();
};
