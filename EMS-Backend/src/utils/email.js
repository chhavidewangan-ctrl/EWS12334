const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html || options.message
    };

    await transporter.sendMail(message);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

const emailTemplates = {
  welcomeEmail: (name, email, password) => ({
    subject: 'Welcome to EMS ERP System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to EMS ERP</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name},</h2>
          <p>Your account has been created successfully.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please login and change your password immediately.</p>
          <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Login Now</a>
        </div>
      </div>
    `
  }),

  resetPasswordEmail: (name, otp) => ({
    subject: 'Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name},</h2>
          <p>Your password reset OTP is:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="letter-spacing: 8px; color: #f5576c; font-size: 36px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      </div>
    `
  }),

  verificationEmail: (name, otp) => ({
    subject: 'Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Email Verification</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name},</h2>
          <p>Your email verification OTP is:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="letter-spacing: 8px; color: #4facfe; font-size: 36px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      </div>
    `
  }),

  leaveStatusEmail: (name, status, leaveType, startDate, endDate) => ({
    subject: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${status === 'approved' ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Leave ${status === 'approved' ? 'Approved' : 'Rejected'}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2>Hello ${name},</h2>
          <p>Your ${leaveType} leave from ${startDate} to ${endDate} has been <strong>${status}</strong>.</p>
        </div>
      </div>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
