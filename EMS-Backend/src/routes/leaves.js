const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus, getLeaveBalance, cancelLeave, updateLeave } = require('../controllers/leaveController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);
router.use(companyCheck);

router.get('/balance', getLeaveBalance);
router.route('/')
  .get(getLeaves)
  .post(applyLeave);
router.put('/:id/status', authorize('superadmin', 'admin', 'hr', 'manager'), updateLeaveStatus);
router.put('/:id/cancel', cancelLeave);
router.put('/:id', updateLeave);

module.exports = router;
