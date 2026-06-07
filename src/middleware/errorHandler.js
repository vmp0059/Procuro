const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry — resource already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced resource does not exist' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
