require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Company, Branch, Role, Holiday } = require('../models/System');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default company
    let company = await Company.findOne({ name: 'Tsrijanali IT Services' });
    if (!company) {
      company = await Company.create({
        name: 'Tsrijanali IT Services',
        email: 'info@tsrijanali.com',
        phone: '+91 9876543210',
        address: {
          street: '123 Business Park',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          pincode: '110001'
        },
        industry: 'Information Technology',
        settings: {
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHoursStart: '09:00',
          workingHoursEnd: '18:00',
          timezone: 'Asia/Kolkata',
          currency: 'INR'
        }
      });
      console.log('Default company created');
    }

    // Create default branch
    let branch = await Branch.findOne({ company: company._id });
    if (!branch) {
      branch = await Branch.create({
        company: company._id,
        name: 'Head Office',
        code: 'HO',
        isHeadOffice: true,
        address: company.address
      });
      console.log('Default branch created');
    }

    // Create roles
    const defaultRoles = [
      { name: 'Super Admin', slug: 'superadmin', permissions: ['*'], isSystem: true },
      { name: 'Admin', slug: 'admin', permissions: ['employees.*', 'attendance.*', 'leaves.*', 'payroll.*', 'projects.*'], isSystem: true },
      { name: 'HR', slug: 'hr', permissions: ['employees.*', 'attendance.*', 'leaves.*', 'payroll.*'], isSystem: true },
      { name: 'Manager', slug: 'manager', permissions: ['projects.*', 'tasks.*', 'leaves.approve'], isSystem: true },
      { name: 'Accountant', slug: 'accountant', permissions: ['payroll.*', 'sales.*', 'expenses.*', 'invoices.*'], isSystem: true },
      { name: 'Employee', slug: 'employee', permissions: ['attendance.own', 'leaves.own', 'profile.own'], isSystem: true }
    ];

    for (const role of defaultRoles) {
      await Role.findOneAndUpdate(
        { slug: role.slug, company: company._id },
        { ...role, company: company._id },
        { upsert: true, new: true }
      );
    }
    console.log('Roles created');

    // Create super admin user
    const adminExists = await User.findOne({ email: 'admin@tsrijanali.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@tsrijanali.com',
        password: 'Admin@123',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin',
        company: company._id,
        branch: branch._id,
        isActive: true,
        isEmailVerified: true
      });
      console.log('Super Admin created: admin@tsrijanali.com / Admin@123');
    }

    // Create demo users
    const demoUsers = [
      { email: 'hr@tsrijanali.com', password: 'Hr@12345', firstName: 'Priya', lastName: 'Sharma', role: 'hr' },
      { email: 'manager@tsrijanali.com', password: 'Manager@123', firstName: 'Rahul', lastName: 'Kumar', role: 'manager' },
      { email: 'accountant@tsrijanali.com', password: 'Account@123', firstName: 'Anita', lastName: 'Verma', role: 'accountant' },
      { email: 'employee@tsrijanali.com', password: 'Employee@123', firstName: 'Amit', lastName: 'Singh', role: 'employee' }
    ];

    for (const userData of demoUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        await User.create({
          ...userData,
          company: company._id,
          branch: branch._id,
          isActive: true,
          isEmailVerified: true
        });
        console.log(`Created: ${userData.email} / ${userData.password}`);
      }
    }

    // Create holidays
    const holidays2026 = [
      { name: 'Republic Day', date: new Date('2026-01-26'), type: 'public' },
      { name: 'Holi', date: new Date('2026-03-17'), type: 'public' },
      { name: 'Good Friday', date: new Date('2026-04-03'), type: 'public' },
      { name: 'Independence Day', date: new Date('2026-08-15'), type: 'public' },
      { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), type: 'public' },
      { name: 'Diwali', date: new Date('2026-11-08'), type: 'public' },
      { name: 'Christmas', date: new Date('2026-12-25'), type: 'public' }
    ];

    for (const holiday of holidays2026) {
      await Holiday.findOneAndUpdate(
        { company: company._id, name: holiday.name, date: holiday.date },
        { ...holiday, company: company._id },
        { upsert: true }
      );
    }
    console.log('Holidays created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Super Admin: admin@tsrijanali.com / Admin@123');
    console.log('HR: hr@tsrijanali.com / Hr@12345');
    console.log('Manager: manager@tsrijanali.com / Manager@123');
    console.log('Accountant: accountant@tsrijanali.com / Account@123');
    console.log('Employee: employee@tsrijanali.com / Employee@123');

    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error);
    process.exit(1);
  }
};

seedDatabase();
