const express = require('express');
const router = express.Router();
const { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, uploadDocument, getEmployeeStats } = require('../controllers/employeeController');
const { protect, authorize, companyCheck } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.use(companyCheck);

router.get('/stats', authorize('superadmin', 'admin', 'hr', 'manager'), getEmployeeStats);
router.route('/')
  .get(authorize('superadmin', 'admin', 'hr', 'manager'), getEmployees)
  .post(authorize('superadmin', 'admin', 'hr'), createEmployee);

router.route('/:id')
  .get(getEmployee)
  .put(authorize('superadmin', 'admin', 'hr'), updateEmployee)
  .delete(authorize('superadmin', 'admin'), deleteEmployee);

router.post('/:id/documents', authorize('superadmin', 'admin', 'hr', 'employee'), upload.single('file'), uploadDocument);

module.exports = router;
