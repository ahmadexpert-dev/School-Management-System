const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

async function listTimetable(req, res) {
  const { classId, section } = req.query;
  const where = { schoolId: req.schoolId, ...(classId && { classId }), ...(section && { section }) };

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (classId && !assignedClassIds.includes(classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
    where.classId = classId ? classId : { in: assignedClassIds };
  } else if (req.auth.role === 'parent') {
    const child = await prisma.student.findFirst({ where: { schoolId: req.schoolId, parentUserId: req.auth.userId } });
    if (!child) return res.json({ entries: [] });
    where.classId = child.classId;
  }

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: { class: true, teacher: { select: { id: true, name: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  return res.json({ entries });
}

// Distinct, non-empty section values among the class's enrolled students —
// backs the "Section" dropdown on the timetable form without needing a
// separate Section master-data model.
async function listClassSections(req, res) {
  const { classId } = req.params;
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const rows = await prisma.student.findMany({
    where: { schoolId: req.schoolId, classId, section: { not: null } },
    select: { section: true },
    distinct: ['section'],
  });
  const sections = rows.map((r) => r.section).filter(Boolean).sort();
  return res.json({ sections });
}

async function createTimetableEntry(req, res) {
  const { classId, section, dayOfWeek, startTime, endTime, subject, teacherId } = req.body;

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  if (teacherId) {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId: req.schoolId, role: { in: ['teacher', 'staff'] } },
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  }

  const entry = await prisma.timetableEntry.create({
    data: { schoolId: req.schoolId, classId, section, dayOfWeek, startTime, endTime, subject, teacherId },
  });
  return res.status(201).json({ entry });
}

async function updateTimetableEntry(req, res) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Timetable entry not found' });

  const { section, dayOfWeek, startTime, endTime, subject, teacherId } = req.body;
  const entry = await prisma.timetableEntry.update({
    where: { id: existing.id },
    data: {
      ...(section !== undefined && { section }),
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(subject !== undefined && { subject }),
      ...(teacherId !== undefined && { teacherId }),
    },
  });
  return res.json({ entry });
}

async function deleteTimetableEntry(req, res) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Timetable entry not found' });

  await prisma.timetableEntry.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = {
  listTimetable,
  listClassSections,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
};
