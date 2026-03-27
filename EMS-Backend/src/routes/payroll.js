const express = require('express');
const router = express.Router();
const { generatePayroll, getPayrolls, getPayroll, updatePayrollStatus, getSalaryReport } = require('../controllers/payrollController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);
router.use(companyCheck);

router.get('/report', authorize('superadmin', 'admin', 'hr', 'accountant'), getSalaryReport);
router.post('/generate', authorize('superadmin', 'admin', 'hr', 'accountant'), generatePayroll);
router.get('/', getPayrolls);
router.get('/:id', getPayroll);
router.put('/:id/status', authorize('superadmin', 'admin', 'accountant'), updatePayrollStatus);

module.exports = router;
