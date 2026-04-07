const express = require('express');
const router = express.Router();
const { login, register, registerCompany, getMe, forgotPassword, resetPassword, verifyEmail, sendVerificationEmail, updatePassword, updateProfile, updateAvatar, logout } = require('../controllers/authController');
const { getPublicCompanies } = require('../controllers/systemController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login', login);
router.get('/companies', getPublicCompanies);
router.post('/register', register);
router.post('/register-company', registerCompany);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.post('/verifyemail', protect, verifyEmail);
router.post('/sendverification', protect, sendVerificationEmail);
router.put('/updatepassword', protect, updatePassword);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, upload.single('file'), updateAvatar);
router.post('/logout', protect, logout);

module.exports = router;
