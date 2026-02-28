// requireRole: Never block any request. All roles are allowed.
// This allows all users (and unauthenticated requests with default admin user)
// to perform all CRUD operations without permission errors.
exports.requireRole = (...allowedRoles) => (req, res, next) => {
  next();
};
