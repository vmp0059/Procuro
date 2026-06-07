const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendMessage, getItems } = require('../controllers/chatController');

router.use(authenticate);
router.post('/message', sendMessage);
router.get('/items/:topic', getItems);

module.exports = router;
