const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

/**
 * Owner/admin see every class. Teacher/staff only see classes they're
 * assigned to via ClassTeacher — otherwise class-picker dropdowns (exam
 * creation, attendance) would let them pick a class the backend then 403s
 * on submit.
 */
async function listClasses(req, res) {
  const where = { schoolId: req.schoolId };
  if (['teacher', 'staff'].includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    where.id = { in: assignedClassIds };
  }

  const classes = await prisma.class.findMany({
    where,
    orderBy: { className: 'asc' },
    include: { _count: { select: { students: true } } },
  });
  return res.json({ classes });
}

async function getClass(req, res) {
  const cls = await prisma.class.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
    include: {
      students: true,
      teachers: {
        include: { teacher: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  return res.json({ class: cls });
}

async function createClass(req, res) {
  const { className, standardFee } = req.body;
  const cls = await prisma.class.create({
    data: { schoolId: req.schoolId, className, standardFee },
  });
  return res.status(201).json({ class: cls });
}

async function updateClass(req, res) {
  const existing = await prisma.class.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Class not found' });

  const { className, standardFee } = req.body;
  const cls = await prisma.class.update({
    where: { id: existing.id },
    data: {
      ...(className !== undefined && { className }),
      ...(standardFee !== undefined && { standardFee }),
    },
  });
  return res.json({ class: cls });
}

async function deleteClass(req, res) {
  const existing = await prisma.class.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Class not found' });

  await prisma.class.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

async function assignTeacher(req, res) {
  const { teacherId } = req.body;
  const classId = req.params.id;

  const [cls, teacher] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } }),
    prisma.user.findFirst({ where: { id: teacherId, schoolId: req.schoolId, role: { in: ['teacher', 'staff'] } } }),
  ]);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (!teacher) return res.status(404).json({ error: 'Teacher or staff user not found' });

  const assignment = await prisma.classTeacher.upsert({
    where: { teacherId_classId: { teacherId, classId } },
    update: {},
    create: { schoolId: req.schoolId, teacherId, classId },
  });
  return res.status(201).json({ assignment });
}

async function unassignTeacher(req, res) {
  const classId = req.params.id;
  const teacherId = req.params.teacherId;

  const assignment = await prisma.classTeacher.findFirst({
    where: { schoolId: req.schoolId, classId, teacherId },
  });
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  await prisma.classTeacher.delete({ where: { id: assignment.id } });
  return res.status(204).send();
}

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  assignTeacher,
  unassignTeacher,
};
