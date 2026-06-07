const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, verifyRegisterOtp, login, getMe, changePassword, verifyChangePasswordOtp } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').isIn(['procurement_officer', 'manager', 'vendor']).withMessage('Invalid role — admin accounts cannot be self-registered'),
], validate, register);

router.post('/register/verify', [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Valid OTP required'),
], validate, verifyRegisterOtp);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], validate, login);

router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, changePassword);

router.put('/change-password/verify', authenticate, [
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Valid OTP required'),
], validate, verifyChangePasswordOtp);

module.exports = router;
