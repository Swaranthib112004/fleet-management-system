// Only allow Admin role
exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Only Admin is allowed to perform this action.' });
  next();
};
