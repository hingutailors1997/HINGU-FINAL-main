const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Use a valid 24-char hex ObjectId to prevent Mongoose CastError
  req.user = { id: '64a1b2c3d4e5f6a7b8c9d0e1', role: 'owner' };
  next();
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Bypass for development
    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};
