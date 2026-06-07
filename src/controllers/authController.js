const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const OtpRequest = require('../models/OtpRequest');
const logActivity = require('../utils/activityLogger');
const { generateOtp } = require('../utils/otp');
const { sendMail } = require('../utils/mailer');

const OTP_PURPOSE_REGISTER = 'register';
const OTP_PURPOSE_CHANGE_PASSWORD = 'change_password';
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

const getOtpEmailMessage = ({ purpose, otp, name }) => {
  if (purpose === OTP_PURPOSE_CHANGE_PASSWORD) {
    return {
      subject: 'VendorBridge password change OTP',
      text: `Your VendorBridge password change OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html: `<p>Hello ${name || 'there'},</p><p>Your VendorBridge password change OTP is <strong>${otp}</strong>.</p><p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    };
  }

  return {
    subject: 'VendorBridge registration OTP',
    text: `Your VendorBridge registration OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `<p>Hello ${name || 'there'},</p><p>Your VendorBridge registration OTP is <strong>${otp}</strong>.</p><p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
  };
};

const buildVendorPayload = ({ company_name, gst_number, contact_person, phone, address, category, name }) => ({
  company_name: company_name || name,
  gst_number: gst_number || null,
  contact_person: contact_person || name,
  phone: phone || null,
  address: address || null,
  category: category || null,
});

const verifyOtpRequest = async ({ email, otp, purpose, userId = null }) => {
  const pending = await OtpRequest.findLatestActive({ email, purpose, userId });

  if (!pending) {
    return { ok: false, status: 404, message: 'OTP request not found or expired' };
  }

  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await OtpRequest.removeById(pending.id);
    return { ok: false, status: 429, message: 'OTP attempt limit reached' };
  }

  const isMatch = await bcrypt.compare(String(otp || ''), pending.otp_hash);
  if (!isMatch) {
    await OtpRequest.incrementAttempts(pending.id);
    return { ok: false, status: 400, message: 'Invalid OTP' };
  }

  await OtpRequest.markVerified(pending.id);
  return { ok: true, pending };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, company_name, gst_number, contact_person, phone, address, category } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 12);

    const pending = await OtpRequest.create({
      email,
      purpose: OTP_PURPOSE_REGISTER,
      payload: {
        name,
        email,
        password: hashed,
        role,
        vendor: role === 'vendor' ? buildVendorPayload({ company_name, gst_number, contact_person, phone, address, category, name }) : null,
      },
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    const mail = getOtpEmailMessage({ purpose: OTP_PURPOSE_REGISTER, otp, name });
    try {
      await sendMail({ to: email, ...mail });
    } catch (mailErr) {
      await OtpRequest.removeById(pending.id);
      throw mailErr;
    }

    res.status(201).json({
      success: true,
      message: 'Registration OTP sent to email',
    });
  } catch (err) {
    next(err);
  }
};

const verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOtpRequest({ email, otp, purpose: OTP_PURPOSE_REGISTER });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const { pending } = result;
    const payload = pending.payload || {};
    const existing = await User.findByEmail(email);
    if (existing) {
      await OtpRequest.removeById(pending.id);
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    });

    let vendorProfile = null;
    if (payload.role === 'vendor' && payload.vendor) {
      vendorProfile = await Vendor.create({
        user_id: user.id,
        company_name: payload.vendor.company_name,
        gst_number: payload.vendor.gst_number,
        contact_person: payload.vendor.contact_person,
        email: payload.email,
        phone: payload.vendor.phone,
        address: payload.vendor.address,
        category: payload.vendor.category,
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    await OtpRequest.removeById(pending.id);
    await logActivity(user.id, 'USER_REGISTERED', 'user', user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token, ...(vendorProfile && { vendor: vendorProfile }) },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    await logActivity(user.id, 'USER_LOGIN', 'user', user.id);

    const { password: _, ...safeUser } = user;
    res.json({ success: true, message: 'Login successful', data: { user: safeUser, token } });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const currentHash = await User.getPasswordById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, currentHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 12);

    const pending = await OtpRequest.create({
      email: req.user.email,
      user_id: req.user.id,
      purpose: OTP_PURPOSE_CHANGE_PASSWORD,
      payload: { newPassword: hashed },
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    const mail = getOtpEmailMessage({ purpose: OTP_PURPOSE_CHANGE_PASSWORD, otp, name: req.user.name });
    try {
      await sendMail({ to: req.user.email, ...mail });
    } catch (mailErr) {
      await OtpRequest.removeById(pending.id);
      throw mailErr;
    }

    res.json({ success: true, message: 'Password change OTP sent to email' });
  } catch (err) {
    next(err);
  }
};

const verifyChangePasswordOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const result = await verifyOtpRequest({
      email: req.user.email,
      otp,
      purpose: OTP_PURPOSE_CHANGE_PASSWORD,
      userId: req.user.id,
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const newPassword = result.pending.payload?.newPassword;
    if (!newPassword) {
      await OtpRequest.removeById(result.pending.id);
      return res.status(400).json({ success: false, message: 'Password payload missing' });
    }

    await User.updatePassword(req.user.id, newPassword);
    await OtpRequest.removeById(result.pending.id);
    await logActivity(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, verifyRegisterOtp, login, getMe, changePassword, verifyChangePasswordOtp };
