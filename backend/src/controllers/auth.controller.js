const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/jwt.util');
const { sendEmail } = require('../services/email.service');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new School plus its first owner User in one transaction.
 * This is the only route that creates a School — every other route
 * operates within an existing school scoped by the JWT.
 */
async function registerSchool(req, res) {
  const { schoolName, address, contactPhone, ownerName, email, password, phone } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: schoolName,
        address,
        contactPhone,
      },
    });

    const owner = await tx.user.create({
      data: {
        schoolId: school.id,
        name: ownerName,
        email,
        passwordHash,
        role: 'owner',
        phone,
      },
    });

    return { school, owner };
  });

  const token = signToken({
    userId: result.owner.id,
    schoolId: result.school.id,
    role: result.owner.role,
  });

  return res.status(201).json({
    token,
    user: {
      id: result.owner.id,
      name: result.owner.name,
      email: result.owner.email,
      role: result.owner.role,
    },
    school: {
      id: result.school.id,
      name: result.school.name,
    },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  // Timed and logged explicitly — this is the very first query most users
  // hit, so it's the fastest way to see in server logs whether a slow
  // login is a DB-connection problem or something else entirely.
  const dbStart = Date.now();
  const user = await prisma.user.findUnique({ where: { email } });
  console.log(`[login] user lookup took ${Date.now() - dbStart}ms`);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
  });

  return res.json({
    token,
    role: user.role,
    schoolId: user.schoolId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

/**
 * Requests a password reset. Always returns a generic 200 regardless of
 * whether the email exists, to avoid leaking which emails are registered.
 *
 * Delivery goes through email.service.js: a real email via Resend if
 * RESEND_API_KEY is set, otherwise it logs the reset link to the console
 * (same stub-by-default pattern as notification.service.js's SMS stub).
 */
async function forgotPassword(req, res) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your School Management System password',
      html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    });
  }

  return res.json({ message: 'If that email is registered, a reset link has been sent.' });
}

/**
 * Completes a password reset. The token is looked up by its SHA-256 hash
 * (never the raw token, which was never persisted) and must be unused and
 * unexpired. On success, all of the user's outstanding reset tokens are
 * invalidated so an old link can't be replayed after a successful reset.
 */
async function resetPassword(req, res) {
  const { token, password } = req.body;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return res.json({ message: 'Password has been reset. You can now log in.' });
}

module.exports = { registerSchool, login, forgotPassword, resetPassword };
