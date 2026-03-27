const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getAttendance, markAttendance, getTodayAttendance, getMyTodayAttendance } = require('../controllers/attendanceController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);
router.use(companyCheck);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/today', authorize('superadmin', 'admin', 'hr', 'manager'), getTodayAttendance);
router.get('/my-today', getMyTodayAttendance);
router.post('/mark', authorize('superadmin', 'admin', 'hr'), markAttendance);
router.get('/', getAttendance);

module.exports = router;
