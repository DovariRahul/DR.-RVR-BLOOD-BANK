const { ForbiddenError } = require('../utils/errors');

/**
 * Role-based access control middleware factory.
 * Usage: authorize('admin') or authorize('patient', 'admin')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}.`));
    }

    next();
  };
}

module.exports = { authorize };
