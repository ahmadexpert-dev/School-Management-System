const prisma = require('../utils/prisma');

// The fixed catalog of extra grants an owner/admin can hand to a specific
// teacher/staff user, beyond what their base Role normally allows.
const AVAILABLE_PERMISSIONS = [
  { key: 'fees:view', label: 'View fees' },
  { key: 'fees:manage', label: 'Manage fees (generate/edit records)' },
  { key: 'reports:view', label: 'View reports' },
  { key: 'classes:manage', label: 'Create/edit/delete classes' },
  { key: 'staff:manage', label: 'Manage staff (employee) records' },
];

async function listAvailablePermissions(req, res) {
  return res.json({ permissions: AVAILABLE_PERMISSIONS });
}

async function listUserPermissions(req, res) {
  const user = await prisma.user.findFirst({ where: { id: req.params.userId, schoolId: req.schoolId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const grants = await prisma.userPermission.findMany({ where: { schoolId: req.schoolId, userId: user.id } });
  return res.json({ permissions: grants.map((g) => g.key) });
}

/**
 * Replaces the full set of extra permissions for a user in one call — the
 * frontend sends the complete desired list (a checkbox list), simpler than
 * diffing add/remove on the client.
 */
async function setUserPermissions(req, res) {
  const user = await prisma.user.findFirst({ where: { id: req.params.userId, schoolId: req.schoolId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { keys } = req.body;
  // Deduplicated — a repeated key in the incoming list would otherwise hit
  // createMany with two identical (userId, key) rows and crash with a
  // unique-constraint 500 instead of just applying the grant once.
  const validKeys = [...new Set(keys.filter((k) => AVAILABLE_PERMISSIONS.some((p) => p.key === k)))];

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { schoolId: req.schoolId, userId: user.id } }),
    ...(validKeys.length
      ? [
          prisma.userPermission.createMany({
            data: validKeys.map((key) => ({ schoolId: req.schoolId, userId: user.id, key })),
          }),
        ]
      : []),
  ]);

  const grants = await prisma.userPermission.findMany({ where: { schoolId: req.schoolId, userId: user.id } });
  return res.json({ permissions: grants.map((g) => g.key) });
}

/**
 * Checked alongside the fixed Role enum (never instead of it) — call this
 * from a route to allow either a listed role OR a specific extra grant.
 */
async function userHasPermission(schoolId, userId, key) {
  const grant = await prisma.userPermission.findUnique({
    where: { userId_key: { userId, key } },
  });
  return Boolean(grant) && grant.schoolId === schoolId;
}

module.exports = {
  AVAILABLE_PERMISSIONS,
  listAvailablePermissions,
  listUserPermissions,
  setUserPermissions,
  userHasPermission,
};
