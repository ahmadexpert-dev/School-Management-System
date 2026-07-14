const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const {
  registerSchoolSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validation/schemas');
const { registerSchool, login, forgotPassword, resetPassword } = require('../controllers/auth.controller');

const router = express.Router();

router.use(authLimiter);

router.post('/register-school', validateBody(registerSchoolSchema), asyncHandler(registerSchool));
router.post('/login', validateBody(loginSchema), asyncHandler(login));
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(resetPassword));

module.exports = router;
