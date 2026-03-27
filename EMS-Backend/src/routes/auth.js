const express = require('express');
const router = express.Router();
const { login, register, registerCompany, getMe, forgotPassword, resetPassword, verifyEmail, sendVerificationEmail, updatePassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.post('/register-company', registerCompany);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.post('/verifyemail', protect, verifyEmail);
router.post('/sendverification', protect, sendVerificationEmail);
router.put('/updatepassword', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;
