const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/db');
const { asyncHandler, formatPhoneE164 } = require('../utils/helpers');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * Generate JWT access and refresh tokens.
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { full_name, email, phone, password, blood_group } = req.body;

  // Check if email already exists
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    throw new ConflictError('Email already registered.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const formattedPhone = formatPhoneE164(phone);

  // Insert user
  const userRole = 'patient'; // Force patient on initial signup to avoid stranded profiles
  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, phone, role, blood_group)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [full_name, email, passwordHash, formattedPhone, userRole, blood_group || null]
  );

  const userId = result.insertId;
  const user = { id: userId, full_name, email, role: userRole };
  const tokens = generateTokens(user);

  logger.info(`New user registered: ${email} as ${userRole}`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: {
      user,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    }
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Your account has been deactivated. Contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const tokens = generateTokens(user);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    }
  });
});

/**
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new UnauthorizedError('Refresh token required.');
  }

  const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  const user = await queryOne('SELECT id, email, role FROM users WHERE id = ? AND is_active = 1', [decoded.id]);

  if (!user) {
    throw new UnauthorizedError('Invalid refresh token.');
  }

  const tokens = generateTokens(user);

  res.json({
    success: true,
    data: {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    }
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.is_verified, u.is_active, u.created_at, 
            d.blood_group, d.last_donation_date 
     FROM users u 
     LEFT JOIN donors d ON u.id = d.user_id 
     WHERE u.id = ?`,
    [req.user.id]
  );

  // If user is a donor, include donor profile info
  let donorProfile = null;
  if (user.role === 'donor') {
    donorProfile = await queryOne('SELECT * FROM donors WHERE user_id = ?', [user.id]);
    
    // Self-healing: if role is donor but no profile exists, revert role to patient
    if (!donorProfile) {
      await query("UPDATE users SET role = 'patient' WHERE id = ?", [user.id]);
      user.role = 'patient';
    }
  }

  res.json({
    success: true,
    data: {
      user,
      donor_profile: donorProfile
    }
  });
});

/**
 * POST /api/auth/forgot-password
 * Always returns 200 to prevent email enumeration.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // In production: generate reset token, store in DB, send email.
  // For now, just acknowledge.
  logger.info(`Password reset requested for: ${email}`);

  res.json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.'
  });
});

/**
 * PATCH /api/auth/fcm-token
 */
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) {
    throw new UnauthorizedError('FCM token is required.');
  }

  await query('UPDATE users SET fcm_token = ? WHERE id = ?', [fcm_token, req.user.id]);
  logger.info(`Updated FCM token for user ${req.user.id}`);

  res.json({
    success: true,
    message: 'FCM token updated successfully.'
  });
});

module.exports = { register, login, refreshToken, getMe, forgotPassword, updateFcmToken };
