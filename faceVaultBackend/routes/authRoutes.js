const express = require('express');
const router = express.Router();
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
} = require('../controllers/authController');

router.post('/signup', signup);          // create account + email OTP
router.post('/verify-otp', verifyOtp);    // confirm the code → returns token
router.post('/resend-otp', resendOtp);    // send a fresh code
router.post('/login', login);

module.exports = router;
