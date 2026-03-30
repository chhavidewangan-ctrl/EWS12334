const express = require('express');
const router = express.Router();
const erp = require('../controllers/erpController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);
router.use(companyCheck);

const upload = require('../middleware/upload');

// Clients
router.route('/clients').get(erp.getClients).post(authorize('superadmin', 'admin', 'accountant'), upload.single('logo'), erp.createClient);
router.route('/clients/:id').put(authorize('superadmin', 'admin', 'accountant'), upload.single('logo'), erp.updateClient).delete(authorize('superadmin', 'admin', 'accountant'), erp.deleteClient);

// Vendors
router.route('/vendors').get(erp.getVendors).post(authorize('superadmin', 'admin', 'accountant'), upload.single('logo'), erp.createVendor);
router.route('/vendors/:id').put(authorize('superadmin', 'admin', 'accountant'), upload.single('logo'), erp.updateVendor).delete(authorize('superadmin', 'admin', 'accountant'), erp.deleteVendor);

// Invoices
router.route('/invoices').get(erp.getInvoices).post(authorize('superadmin', 'admin', 'accountant'), erp.createInvoice);
router.route('/invoices/:id').put(authorize('superadmin', 'admin', 'accountant'), erp.updateInvoice).delete(authorize('superadmin', 'admin', 'accountant'), erp.deleteInvoice);


router.route('/expenses').get(erp.getExpenses).post(upload.single('receipt'), erp.createExpense);
router.route('/expenses/:id').put(authorize('superadmin', 'admin', 'accountant', 'employee', 'manager'), upload.single('receipt'), erp.updateExpense).delete(authorize('superadmin', 'admin', 'accountant', 'employee', 'manager'), erp.deleteExpense);

// Inventory
router.route('/inventory').get(erp.getInventory).post(authorize('superadmin', 'admin'), erp.createInventoryItem);
router.route('/inventory/:id').put(authorize('superadmin', 'admin'), erp.updateInventoryItem).delete(authorize('superadmin', 'admin'), erp.deleteInventoryItem);

// Sales
router.route('/sales').get(erp.getSales).post(authorize('superadmin', 'admin', 'accountant'), erp.createSale);
router.route('/sales/:id').put(authorize('superadmin', 'admin', 'accountant'), erp.updateSale).delete(authorize('superadmin', 'admin', 'accountant'), erp.deleteSale);

// Purchases
router.route('/purchases').get(erp.getPurchases).post(authorize('superadmin', 'admin', 'accountant'), erp.createPurchase);
router.route('/purchases/:id').put(authorize('superadmin', 'admin', 'accountant'), erp.updatePurchase).delete(authorize('superadmin', 'admin', 'accountant'), erp.deletePurchase);

module.exports = router;
