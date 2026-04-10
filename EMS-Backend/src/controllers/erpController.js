const { Client, Vendor, Invoice, Expense, Inventory, Sales, Purchase } = require('../models/ERP');
const { logAction } = require('../utils/auditLogger');

// ---- CLIENT CONTROLLERS ----
exports.getClients = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.status) query.status = req.query.status;

    const total = await Client.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const clients = await Client.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ success: true, count: clients.length, total, clients });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createClient = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.logo = `/uploads/${req.file.filename}`;
    const client = await Client.create({ ...data, company: req.companyId || req.body.company, createdBy: req.user.id });
    await logAction(req, 'CREATE', 'Client', `Created new client: ${client.name}`, req.body, client._id);
    res.status(201).json({ success: true, client });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateClient = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.logo = `/uploads/${req.file.filename}`;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Client', `Updated client profile: ${client.name}`, req.body, client._id);
    res.status(200).json({ success: true, client });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found or unauthorized' });
    await logAction(req, 'DELETE', 'Client', `Deleted client: ${client.name}`, { id: client._id, name: client.name }, client._id);
    res.status(200).json({ success: true, message: 'Client deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- VENDOR CONTROLLERS ----
exports.getVendors = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };

    // If limit is 'all', return all vendors without pagination
    if (req.query.limit === 'all') {
      const vendors = await Vendor.find(query).sort({ name: 1 });
      return res.status(200).json({ success: true, count: vendors.length, vendors });
    }

    const total = await Vendor.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const vendors = await Vendor.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ success: true, count: vendors.length, total, vendors });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createVendor = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.logo = `/uploads/${req.file.filename}`;
    const vendor = await Vendor.create({ ...data, company: req.companyId || req.body.company, createdBy: req.user.id });
    await logAction(req, 'CREATE', 'Vendor', `Created new vendor: ${vendor.name}`, req.body, vendor._id);
    res.status(201).json({ success: true, vendor });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateVendor = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.logo = `/uploads/${req.file.filename}`;
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Vendor', `Updated vendor profile: ${vendor.name}`, req.body, vendor._id);
    res.status(200).json({ success: true, vendor });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found or unauthorized' });
    await logAction(req, 'DELETE', 'Vendor', `Deleted vendor: ${vendor.name}`, { id: vendor._id, name: vendor.name }, vendor._id);
    res.status(200).json({ success: true, message: 'Vendor deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- INVOICE CONTROLLERS ----
exports.getInvoices = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.client) query.client = req.query.client;
    const total = await Invoice.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const invoices = await Invoice.find(query).populate('client', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ success: true, count: invoices.length, total, invoices });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createInvoice = async (req, res) => {
  try {
    // Auto-generate invoice number
    const count = await Invoice.countDocuments({ company: req.companyId || req.body.company });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    const items = req.body.items.map(item => ({
      ...item,
      amount: item.quantity * item.rate,
      taxAmount: (item.quantity * item.rate * (item.tax || 0)) / 100
    }));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    let discount = req.body.discount || 0;
    if (req.body.discountType === 'percentage') discount = (subtotal * discount) / 100;
    const total = subtotal + taxTotal - discount;

    const invoice = await Invoice.create({
      ...req.body, invoiceNumber, items, subtotal, taxTotal, total, balanceDue: total,
      company: req.companyId || req.body.company, createdBy: req.user.id
    });
    await logAction(req, 'CREATE', 'Invoice', `Created invoice: ${invoice.invoiceNumber}`, req.body, invoice._id);
    res.status(201).json({ success: true, invoice });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Invoice', `Updated invoice: ${invoice.invoiceNumber}`, req.body, invoice._id);
    res.status(200).json({ success: true, invoice });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found or unauthorized' });
    await logAction(req, 'DELETE', 'Invoice', `Deleted invoice: ${invoice.invoiceNumber}`, { id: invoice._id, number: invoice.invoiceNumber }, invoice._id);
    res.status(200).json({ success: true, message: 'Invoice deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- EXPENSE CONTROLLERS ----
exports.getExpenses = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;

    // SaaS Role-Based Filtering
    const isAdminView = ['superadmin', 'admin', 'hr', 'manager', 'accountant'].includes(req.user.role);
    if (!isAdminView) {
      query.createdBy = req.user.id;
    }

    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    const total = await Expense.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const expenses = await Expense.find(query).populate('createdBy', 'firstName lastName').sort({ date: -1 }).skip((page - 1) * limit).limit(limit);
    const totalAmount = await Expense.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.status(200).json({ success: true, count: expenses.length, total, totalAmount: totalAmount[0]?.total || 0, expenses });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createExpense = async (req, res) => {
  try {
    const expenseData = { ...req.body };
    if (typeof expenseData.receipt !== 'string') delete expenseData.receipt;
    if (req.file) expenseData.receipt = `/uploads/${req.file.filename}`;

    const expense = await Expense.create({
      ...expenseData,
      company: req.companyId || req.body.company,
      createdBy: req.user.id
    });
    await logAction(req, 'CREATE', 'Expense', `Recorded new expense: ${expense.category} - ${expense.amount}`, req.body, expense._id);
    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error("CREATE EXPENSE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const isAdmin = ['superadmin', 'admin', 'accountant'].includes(req.user.role);
    const isOwner = expense.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this expense' });
    }

    if (!isAdmin && expense.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot update approved or rejected expense' });
    }

    const expenseData = { ...req.body };
    if (typeof expenseData.receipt !== 'string') delete expenseData.receipt;
    if (req.file) expenseData.receipt = `/uploads/${req.file.filename}`;

    // Only admins can change status
    if (!isAdmin) delete expenseData.status;

    expense = await Expense.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, expenseData, { new: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Expense', `Updated expense: ${expense.category}`, req.body, expense._id);
    res.status(200).json({ success: true, expense });
  } catch (error) {
    console.error("UPDATE EXPENSE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const isAdmin = ['superadmin', 'admin'].includes(req.user.role);
    const isOwner = expense.createdBy.toString() === req.user.id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    if (!isAdmin && expense.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot delete processed expense' });
    }

    const expenseName = expense.category;
    await Expense.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    await logAction(req, 'DELETE', 'Expense', `Deleted expense: ${expenseName}`, { id: expense._id, category: expense.category }, expense._id);
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error("DELETE EXPENSE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- INVENTORY CONTROLLERS ----
exports.getInventory = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    const total = await Inventory.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const items = await Inventory.find(query).populate('supplier', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ success: true, count: items.length, total, items });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const itemData = { ...req.body };

    // Remove supplier if it's an empty string or an invalid ObjectId to prevent BSONError
    if (!itemData.supplier || !mongoose.Types.ObjectId.isValid(itemData.supplier)) {
      delete itemData.supplier;
    }

    const item = await Inventory.create({
      ...itemData,
      company: req.companyId || req.user.company || req.body.company,
      createdBy: req.user.id
    });
    await logAction(req, 'CREATE', 'Inventory', `Added inventory item: ${item.name}`, req.body, item._id);
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("CREATE INVENTORY ERROR:", error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found or unauthorized' });
    if (item.quantity <= 0) item.status = 'out_of_stock';
    else if (item.quantity <= item.reorderLevel) item.status = 'low_stock';
    else item.status = 'in_stock';
    await item.save();
    await logAction(req, 'UPDATE', 'Inventory', `Updated inventory item: ${item.name}`, req.body, item._id);
    res.status(200).json({ success: true, item });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found or unauthorized' });
    await logAction(req, 'DELETE', 'Inventory', `Deleted inventory item: ${item.name}`, { id: item._id, name: item.name }, item._id);
    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- SALES CONTROLLERS ----
exports.getSales = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    const total = await Sales.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sales = await Sales.find(query).populate('client', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(limit);
    const totalAmount = await Sales.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$total' } } }]);
    res.status(200).json({ success: true, count: sales.length, total, totalAmount: totalAmount[0]?.total || 0, sales });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, company: req.companyId })
      .populate('client')
      .populate('company')
      .populate('items.product');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found or unauthorized' });
    res.status(200).json({ success: true, sale });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createSale = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const saleData = { ...req.body };

    // Clean client ID
    if (!saleData.client || !mongoose.Types.ObjectId.isValid(saleData.client)) {
      delete saleData.client;
    }

    const company = req.companyId || req.body.company || req.user.company;
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company ID is required to record a sale.' });
    }

    const count = await Sales.countDocuments({ company });
    const salesNumber = `SL-${String(count + 1).padStart(5, '0')}`;
    const sale = await Sales.create({
      ...saleData,
      salesNumber,
      company,
      createdBy: req.user.id
    });

    // Update inventory
    for (const item of req.body.items) {
      if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
        const invItem = await Inventory.findById(item.product);
        if (invItem) {
          const newQty = (invItem.quantity || 0) - (Number(item.quantity) || 0);
          let newStatus = 'in_stock';
          if (newQty <= 0) newStatus = 'out_of_stock';
          else if (newQty <= (invItem.reorderLevel || 10)) newStatus = 'low_stock';

          await Inventory.findByIdAndUpdate(item.product, {
            quantity: newQty,
            status: newStatus
          });
        }
      }
    }
    await logAction(req, 'CREATE', 'Sale', `Recorded new sale: ${sale.salesNumber}`, req.body, sale._id);
    res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error("CREATE SALE ERROR:", error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const sale = await Sales.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, req.body, { new: true });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Sale', `Updated sale record: ${sale.salesNumber}`, req.body, sale._id);
    res.status(200).json({ success: true, sale });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- PURCHASE CONTROLLERS ----
exports.getPurchases = async (req, res) => {
  try {
    const query = {};
    if (req.companyId) query.company = req.companyId;
    if (req.query.vendor) query.vendor = req.query.vendor;
    if (req.query.status) query.status = req.query.status;
    const total = await Purchase.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const purchases = await Purchase.find(query).populate('vendor', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ success: true, count: purchases.length, total, purchases });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createPurchase = async (req, res) => {
  try {
    const company = req.companyId || req.body.company || req.user.company;
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company ID is required to create a purchase.' });
    }

    const count = await Purchase.countDocuments({ company });
    const purchaseNumber = `PO-${String(count + 1).padStart(5, '0')}`;
    const purchase = await Purchase.create({
      ...req.body,
      purchaseNumber,
      company,
      createdBy: req.user.id
    });

    if (req.body.status === 'received') {
      for (const item of req.body.items) {
        if (item.product) {
          await Inventory.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
        }
      }
    }
    res.status(201).json({ success: true, purchase });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, req.body, { new: true });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found or unauthorized' });
    await logAction(req, 'UPDATE', 'Purchase', `Updated purchase record: ${purchase.purchaseNumber}`, req.body, purchase._id);
    res.status(200).json({ success: true, purchase });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sales.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found or unauthorized' });
    await logAction(req, 'DELETE', 'Sale', `Deleted sale record: ${sale.salesNumber}`, { id: sale._id, number: sale.salesNumber }, sale._id);
    res.status(200).json({ success: true, message: 'Sale deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found or unauthorized' });
    await logAction(req, 'DELETE', 'Purchase', `Deleted purchase record: ${purchase.purchaseNumber}`, { id: purchase._id, number: purchase.purchaseNumber }, purchase._id);
    res.status(200).json({ success: true, message: 'Purchase deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};
