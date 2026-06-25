const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerValidator, loginValidator } = require('../middleware/validator');
const { register, login, refreshToken, getMe, forgotPassword, updateFcmToken } = require('../controllers/auth.controller');

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', authLimiter, loginValidator, login);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.patch('/fcm-token', authenticate, updateFcmToken);

module.exports = router;
