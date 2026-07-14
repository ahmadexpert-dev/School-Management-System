const rateLimit = require('express-rate-limit');

// Generous default for normal API usage.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limit on auth endpoints (login, register, password reset) to slow
// down credential stuffing / brute force / email-enumeration attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

module.exports = { apiLimiter, authLimiter };
