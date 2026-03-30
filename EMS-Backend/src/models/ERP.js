const mongoose = require('mongoose');

// Client Model
const clientSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  logo: String,
  email: String,
  phone: String,
  contactPerson: String,
  address: String,
  gstNumber: String,
  panNumber: String,
  website: String,
  industry: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Vendor Model
const vendorSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  logo: String,
  email: String,
  phone: String,
  contactPerson: String,
  address: String,
  gstNumber: String,
  panNumber: String,
  bankDetails: { bankName: String, accountNumber: String, ifscCode: String },
  category: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  rating: { type: Number, min: 1, max: 5 },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Invoice Model
const invoiceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, unique: true, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  items: [{
    description: String,
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 }
  }],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
  total: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  notes: String,
  terms: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Expense Model
const expenseSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  description: String,
  vendor: String,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentMode: { type: String, enum: ['cash', 'bank_transfer', 'card', 'upi', 'cheque'] },
  receipt: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Inventory Model
const inventorySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  category: String,
  description: String,
  unit: { type: String, default: 'pcs' },
  quantity: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  location: String,
  status: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock'], default: 'in_stock' },
  image: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Sales Model
const salesSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  salesNumber: { type: String, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    tax: Number
  }],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentMode: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  date: { type: Date, default: Date.now },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Purchase Model
const purchaseSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  purchaseNumber: { type: String, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    tax: Number
  }],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentMode: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  receivedDate: Date,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['ordered', 'received', 'cancelled'], default: 'ordered' },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Sales = mongoose.model('Sales', salesSchema);
const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = { Client, Vendor, Invoice, Expense, Inventory, Sales, Purchase };
