const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 401, 'Token is invalid. User no longer exists.');
    }
    if (!user.isActive) {
      return sendError(res, 401, 'Your account has been deactivated.');
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token.');
    }
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired. Please log in again.');
    }
    next(err);
  }
};

module.exports = { protect };
