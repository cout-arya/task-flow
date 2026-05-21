const { sendError } = require('../utils/response');

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Requires role: ${roles.join(' or ')}.`);
    }
    next();
  };
};

module.exports = { restrictTo };
