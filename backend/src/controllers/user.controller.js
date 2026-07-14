const prisma = require('../utils/prisma');
const { hashPassword } = require('../utils/password.util');

// Only an owner may create/edit/delete accounts with these elevated roles —
// an admin cannot grant themselves or others owner/admin access.
const ELEVATED_ROLES = ['owner', 'admin'];

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    where: { schoolId: req.schoolId },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ users });
}

async function createUser(req, res) {
  const { name, email, password, role, phone } = req.body;

  if (ELEVATED_ROLES.includes(role) && req.auth.role !== 'owner') {
    return res.status(403).json({ error: 'Only an owner can create admin or owner accounts' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { schoolId: req.schoolId, name, email, passwordHash, role, phone },
  });

  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
}

async function updateUser(req, res) {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { name, phone, role, password } = req.body;

  const targetsElevated = ELEVATED_ROLES.includes(existing.role) || (role && ELEVATED_ROLES.includes(role));
  if (targetsElevated && req.auth.role !== 'owner') {
    return res.status(403).json({ error: 'Only an owner can modify admin or owner accounts' });
  }

  const data = {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(role !== undefined && { role }),
  };
  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data });
  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
}

async function deleteUser(req, res) {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (existing.id === req.auth.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  if (ELEVATED_ROLES.includes(existing.role) && req.auth.role !== 'owner') {
    return res.status(403).json({ error: 'Only an owner can delete admin or owner accounts' });
  }

  await prisma.user.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
