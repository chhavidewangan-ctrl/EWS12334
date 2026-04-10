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
    // Check if user has the required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }

    // Superadmin Read-Only Enforcement
    // If user is superadmin and trying to perform a non-GET operation (write operation),
    // and they are not specifically allowed via an exception, then block it.
    if (req.user.role === 'superadmin' && req.method !== 'GET') {
      // List of endpoints where superadmin is ALLOWED to write (e.g., login/logout are usually skipped via protect)
      const allowedWritePaths = [
        '/api/auth/logout', 
        '/api/auth/profile',
        '/api/auth/updatepassword',
        '/api/auth/companies' // Allow company approval/rejection
      ];
      
      const isAllowed = allowedWritePaths.some(p => req.originalUrl.includes(p));
      
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Superadmin is in Read-Only mode and cannot perform this action.'
        });
      }
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
  // Superadmin can override companyId via header to view data of other companies.
  // By default, superadmin has no companyId (global view).
  if (isSuperAdmin) {
    if (req.headers['x-company-id']) {
      req.companyId = req.headers['x-company-id'];
    }
  } else if (req.user.company) {
    req.companyId = req.user.company;
  }
  
  next();
};
