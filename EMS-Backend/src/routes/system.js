const express = require('express');
const router = express.Router();
const sys = require('../controllers/systemController');
const { getDashboard, getReport } = require('../controllers/dashboardController');
const { protect, authorize, companyCheck } = require('../middleware/auth');

router.use(protect);

// Dashboard
router.get('/dashboard', companyCheck, getDashboard);
router.get('/reports/:type', companyCheck, authorize('superadmin', 'admin', 'hr', 'accountant', 'manager'), getReport);

// Companies (Super Admin only)
router.route('/companies').get(authorize('superadmin'), sys.getCompanies).post(authorize('superadmin'), sys.createCompany);
router.route('/companies/:id').get(sys.getCompany).put(authorize('superadmin', 'admin'), sys.updateCompany);

// Branches
router.use(companyCheck);
router.route('/branches').get(sys.getBranches).post(authorize('superadmin', 'admin'), sys.createBranch);
router.route('/branches/:id').put(authorize('superadmin', 'admin'), sys.updateBranch).delete(authorize('superadmin', 'admin'), sys.deleteBranch);

// Notifications
router.get('/notifications', sys.getNotifications);
router.put('/notifications/:id/read', sys.markAsRead);
router.post('/direct-message', authorize('superadmin', 'admin', 'hr', 'manager'), sys.sendDirectMessage);

// Announcements
router.route('/announcements').get(sys.getAnnouncements).post(authorize('superadmin', 'admin', 'hr'), sys.createAnnouncement);
router.route('/announcements/:id').put(authorize('superadmin', 'admin', 'hr'), sys.updateAnnouncement).delete(authorize('superadmin', 'admin'), sys.deleteAnnouncement);

// Tickets
router.route('/tickets').get(sys.getTickets).post(sys.createTicket);
router.put('/tickets/:id', authorize('superadmin', 'admin'), sys.updateTicket);
router.post('/tickets/:id/reply', sys.replyTicket);

// Holidays
router.route('/holidays').get(sys.getHolidays).post(authorize('superadmin', 'admin', 'hr'), sys.createHoliday);
router.delete('/holidays/:id', authorize('superadmin', 'admin', 'hr'), sys.deleteHoliday);

module.exports = router;
