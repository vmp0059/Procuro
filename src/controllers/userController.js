const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logActivity = require('../utils/activityLogger');

const getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.findAll({ role, limit: parseInt(limit), offset: parseInt(offset) }),
      User.count({ role }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ success: false, message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, role });

    await logActivity(req.user.id, 'USER_CREATED', 'user', user.id);
    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, is_active } = req.body;
    const user = await User.update(req.params.id, { name, is_active });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await logActivity(req.user.id, 'USER_UPDATED', 'user', req.params.id);
    res.json({ success: true, message: 'User updated', data: user });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const deleted = await User.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });

    await logActivity(req.user.id, 'USER_DELETED', 'user', req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
