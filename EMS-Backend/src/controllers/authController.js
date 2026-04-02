const User = require('../models/User');
const Employee = require('../models/Employee');
const { Company } = require('../models/System');
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
      isActive: true,
    });

    // ── Create Super-Admin User ──────────────────────────────────────────
    createdUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      role: 'superadmin',
      company: createdCompany._id,
      isActive: true,
    });

    // Back-link company → createdBy
    createdCompany.createdBy = createdUser._id;
    await createdCompany.save({ validateBeforeSave: false });

    const token = createdUser.getSignedJwtToken();

    return res.status(201).json({
      success: true,
      message: 'Company registered successfully.',
      token,
      user: {
        id: createdUser._id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
        company: {
          id: createdCompany._id,
          name: createdCompany.name,
        },
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

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
      company: user.company,
      isEmailVerified: user.isEmailVerified
    };

    res.status(200).json({ success: true, token, user: userData });

    // Log the login
    req.user = user;
    req.companyId = user.company;
    await logAction(req, 'LOGIN', 'User', `User logged in: ${user.fullName}`);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Register user (Admin only)
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, company, branch } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    let finalCompany = company || req.user?.company;
    if (!finalCompany) {
      const fallbackCompany = await Company.findOne();
      if (fallbackCompany) finalCompany = fallbackCompany._id;
    }

    const user = await User.create({
      email, password, firstName, lastName,
      role: role || 'employee',
      company: finalCompany,
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

    await logAction(req, 'UPDATE', 'User', `User updated their password`, null, user._id);
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Logout user
// @route POST /api/auth/logout
exports.logout = async (req, res) => {
  await logAction(req, 'LOGOUT', 'User', `User logged out: ${req.user.firstName} ${req.user.lastName}`);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
