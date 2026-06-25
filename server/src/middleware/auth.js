const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const { queryOne } = require('../config/db');

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer <token>) or cookies.
 * Attaches user object to req.user on success.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback: check cookies
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist and are active
    const user = await queryOne(
      'SELECT id, full_name, email, phone, role, is_verified, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      throw new UnauthorizedError('User no longer exists.');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired. Please login again.'));
    }
    next(error);
  }
}

/**
 * Optional authentication — attaches user if token present, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  try {
    await authenticate(req, res, () => {});
  } catch {
    // Ignore auth errors — user remains null
  }
  next();
}

module.exports = { authenticate, optionalAuth };
