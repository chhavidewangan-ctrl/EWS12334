const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  employeeId: { type: String, unique: true, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  probationEndDate: Date,
  confirmationDate: Date,
  resignationDate: Date,
  lastWorkingDate: Date,
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'intern', 'freelancer'],
    default: 'full_time'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_notice', 'terminated', 'resigned'],
    default: 'active'
  },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  // Personal Info
  personalInfo: {
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
    bloodGroup: String,
    nationality: { type: String, default: 'Indian' },
    religion: String,
    fatherName: String,
    motherName: String,
    spouseName: String
  },

  // Contact
  contactInfo: {
    personalEmail: String,
    personalPhone: String,
    emergencyContact: {
      name: String,
      relation: String,
      phone: String
    },
    currentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },

  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branchName: String,
    accountType: { type: String, enum: ['savings', 'current'], default: 'savings' }
  },

  // Identity Documents
  documents: {
    aadharNumber: String,
    panNumber: String,
    passportNumber: String,
    drivingLicense: String,
    voterIdNumber: String
  },

  // Salary Info
  salaryInfo: {
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    travelAllowance: { type: Number, default: 0 },
    pfEmployee: { type: Number, default: 0 },
    pfEmployer: { type: Number, default: 0 },
    esiEmployee: { type: Number, default: 0 },
    esiEmployer: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 }
  },

  // Leave Balance
  leaveBalance: {
    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 12 },
    earned: { type: Number, default: 15 },
    maternity: { type: Number, default: 0 },
    paternity: { type: Number, default: 0 },
    compensatory: { type: Number, default: 0 }
  },

  // Education
  education: [{
    degree: String,
    institution: String,
    university: String,
    year: Number,
    percentage: Number,
    specialization: String
  }],

  // Experience
  experience: [{
    company: String,
    designation: String,
    from: Date,
    to: Date,
    description: String
  }],

  // Skills
  skills: [String],

  // Uploaded Documents
  uploadedDocuments: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  profilePhoto: String,
  notes: String
}, {
  timestamps: true
});

employeeSchema.virtual('fullName').get(function() {
  return this.user ? `${this.user.firstName} ${this.user.lastName}` : '';
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
