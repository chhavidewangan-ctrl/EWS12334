const User = require('../models/User');
const Employee = require('../models/Employee');
const { Company, Notification } = require('../models/System');
const { sendEmail, emailTemplates } = require('../utils/email');
const { logAction } = require('../utils/auditLogger');

// @desc  Register a new Company + Super-Admin user (public onboarding)
// @route POST /api/auth/register-company
exports.registerCompany = async (req, res) => {
  let createdCompany = null;
  let createdUser = null;

  try {
    const {
      // Admin personal details
      firstName, lastName, email, password,
      phone,
      // Company details
      companyName, companyEmail, companyPhone,
      companyWebsite, industry,
      address,          // { street, city, state, country, pincode }
      gstNumber, panNumber,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'First name, last name, email and password are required.' });
    }
    if (!companyName) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // ── Duplicate check ──────────────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // ── Create Company ───────────────────────────────────────────────────
    createdCompany = await Company.create({
      name: companyName.trim(),
      email: companyEmail || email,
      phone: companyPhone || phone || '',
      website: companyWebsite || '',
      industry: industry || '',
      gstNumber: gstNumber || '',
      panNumber: panNumber || '',
      address: address || {},
      status: 'pending',
      isActive: false,
    });

    // ── Create Company Administrator User ───────────────────────────────
    createdUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      role: 'admin',
      company: createdCompany._id,
      isActive: false, // User is also inactive until company is approved
    });

    // Back-link company → createdBy
    createdCompany.createdBy = createdUser._id;
    await createdCompany.save({ validateBeforeSave: false });

    // ── Generate Notification if Website is Missing ─────────────────────
    if (!companyWebsite || companyWebsite.trim() === '') {
      await Notification.create({
        company: createdCompany._id,
        user: createdUser._id,
        title: 'Complete Company Profile',
        message: 'Your company website is missing. Please update it in Company Settings for a complete profile.',
        type: 'warning',
        link: '/settings/company'
      });
    }

    const token = createdUser.getSignedJwtToken();

    return res.status(201).json({
      success: true,
      message: 'Company registration request submitted. Please wait for Superadmin approval.',
      // No token returned yet as they shouldn't be able to log in
      user: {
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        companyName: createdCompany.name,
        status: createdCompany.status
      },
    });

    // Log the registration
    req.user = createdUser;
    req.companyId = createdCompany._id;
    await logAction(req, 'CREATE', 'Company', `New company registered: ${createdCompany.name}`);
    
  } catch (error) {
    // Roll back if partially created
    try {
      if (createdUser?._id) await User.findByIdAndDelete(createdUser._id);
      if (createdCompany?._id) await Company.findByIdAndDelete(createdCompany._id);
    } catch (e) {
      console.error('Rollback failed:', e);
    }

    console.error('Register-company error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// @desc Login user
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password').populate('company', 'name logo');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check Company status if user is not a superadmin
    if (user.role !== 'superadmin' && user.company) {
      if (user.company.status === 'pending') {
        return res.status(401).json({ success: false, message: 'Your company registration is pending approval by Superadmin.' });
      }
      if (user.company.status === 'rejected') {
        return res.status(401).json({ success: false, message: 'Your company registration has been rejected.' });
      }
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account is currently inactive. Please contact your administrator.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    let employee = null;
    if (user.employee) {
      employee = await Employee.findById(user.employee);
    }

    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      company: user.company,
      branch: user.branch,
      isEmailVerified: user.isEmailVerified,
      employee
    };

    res.status(200).json({ success: true, token, user: userData });

    // Log the login
    req.user = user;
    req.companyId = user.company;
    await logAction(req, 'LOGIN', 'User', `User logged in: ${user.fullName}`, { 
      email: user.email, 
      lastLogin: user.lastLogin,
      ip: req.ip
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Register user (Admin only)
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, branch } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Force the company to be the same as the admin's company
    const finalCompany = req.user.company;
    if (!finalCompany && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Admin must belong to a company to create users.' });
    }

    const user = await User.create({
      email, password, firstName, lastName,
      role: role || 'employee',
      company: finalCompany || req.body.company, // Superadmin can still specify
      branch
    });

    // Automatically create Employee profile for self-registered employees
    if (user.role === 'employee' || user.role === 'hr' || user.role === 'manager' || user.role === 'accountant') {
      try {
        const employee = await Employee.create({
          user: user._id,
          company: finalCompany,
          branch,
          employeeId: `EMP-${Date.now()}`,
          department: 'General',
          designation: user.role.toUpperCase(),
          joiningDate: new Date(),
          status: 'active'
        });
        user.employee = employee._id;
        await user.save();
      } catch (e) {
        console.error('Auto-employee profile creation failed:', e);
      }
    }

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

    await logAction(req, 'CREATE', 'User', `Admin created new user: ${user.email}`, null, user._id);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('company', 'name logo settings')
      .populate('branch', 'name');

    let employee = null;
    if (user.employee) {
      employee = await Employee.findById(user.employee);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        company: user.company,
        branch: user.branch,
        isEmailVerified: user.isEmailVerified,
        employee
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Forgot password
// @route POST /api/auth/forgotpassword
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user with that email' });
    }

    const otp = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const template = emailTemplates.resetPasswordEmail(user.firstName, otp);
    await sendEmail({
      email: user.email,
      subject: template.subject,
      html: template.html
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc Reset password
// @route POST /api/auth/resetpassword
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Verify email with OTP
// @route POST /api/auth/verifyemail
exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await User.findOne({
      _id: req.user.id,
      emailVerificationOTP: otp,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Send verification email
// @route POST /api/auth/sendverification
exports.sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const otp = user.getEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    const template = emailTemplates.verificationEmail(user.firstName, otp);
    await sendEmail({
      email: user.email,
      subject: template.subject,
      html: template.html
    });

    res.status(200).json({ success: true, message: 'Verification OTP sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc Update password
// @route PUT /api/auth/updatepassword
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({ success: true, token, message: 'Password updated' });

    await logAction(req, 'UPDATE', 'User', `User updated their password`, { userId: user._id }, user._id);
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    // Find user and update
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      }
    });

    await logAction(req, 'UPDATE', 'User', `User updated their profile`, req.body, user._id);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update user avatar
// @route POST /api/auth/profile/avatar
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.avatar = `uploads/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      avatar: user.avatar
    });

    await logAction(req, 'UPDATE', 'User', `User updated their profile photo`, { avatar: user.avatar }, user._id);
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Logout user
// @route POST /api/auth/logout
exports.logout = async (req, res) => {
  await logAction(req, 'LOGOUT', 'User', `User logged out: ${req.user.firstName} ${req.user.lastName}`, { userId: req.user.id });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ── Superadmin: Company Approval ─────────────────────────────────────

// @desc Get all companies (Superadmin only)
// @route GET /api/auth/companies
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().populate('createdBy', 'firstName lastName email');
    res.status(200).json({ success: true, count: companies.length, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Approve/Reject company registration
// @route PUT /api/auth/companies/:id/status
exports.updateCompanyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    company.status = status;
    company.isActive = status === 'approved';
    await company.save();

    // If approved, also activate the admin user who created it
    if (status === 'approved' && company.createdBy) {
      await User.findByIdAndUpdate(company.createdBy, { isActive: true });
    }

    res.status(200).json({ 
      success: true, 
      message: `Company ${status} successfully.`, 
      data: company 
    });

    await logAction(req, 'UPDATE', 'Company', `Company status updated to ${status}: ${company.name}`);
  } catch (error) {
    console.error('Update company status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
