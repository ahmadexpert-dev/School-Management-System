const prisma = require('../utils/prisma');

// Roles scoped to their assigned classes for attendance/grades, via the
// ClassTeacher join table (the name predates the 'staff' role but the
// assignment mechanism applies to both equally).
const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

/**
 * Restricts access to a specific classId (read from req.params.classId or
 * req.body.classId) to owner/admin, or to a teacher/staff user only if they
 * are assigned to that class via ClassTeacher. Must run after scopeToSchool.
 */
function requireClassAccess(getClassId) {
  return async (req, res, next) => {
    const classId = getClassId(req);
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    if (req.auth.role === 'owner' || req.auth.role === 'admin') {
      return next();
    }

    if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
      const assignment = await prisma.classTeacher.findFirst({
        where: { schoolId: req.schoolId, teacherId: req.auth.userId, classId },
      });
      if (!assignment) {
        return res.status(403).json({ error: 'Forbidden: not assigned to this class' });
      }
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  };
}

/**
 * Returns the list of classIds a teacher/staff user is assigned to, for use
 * when filtering list endpoints (e.g. GET attendance across classes).
 * Returns null for owner/admin, meaning "no restriction".
 */
async function getAssignedClassIds(req) {
  if (req.auth.role === 'owner' || req.auth.role === 'admin') return null;

  const assignments = await prisma.classTeacher.findMany({
    where: { schoolId: req.schoolId, teacherId: req.auth.userId },
    select: { classId: true },
  });
  return assignments.map((a) => a.classId);
}

module.exports = { requireClassAccess, getAssignedClassIds };
