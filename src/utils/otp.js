const crypto = require('crypto');

const generateOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

const normalizeOtp = (value) => String(value || '').trim();

module.exports = { generateOtp, normalizeOtp };
