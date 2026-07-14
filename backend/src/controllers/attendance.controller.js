const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

/**
 * Bulk-marks attendance for a class on a given date. Body:
 * { classId, date, records: [{ studentId, status }] }
 * Upserts so re-marking the same day updates rather than duplicates.
 */
async function markAttendance(req, res) {
  const { classId, date, records } = req.body;

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const attendanceDate = new Date(date);
  const results = [];

  for (const { studentId, status } of records) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId, classId },
    });
    if (!student) continue;

    const existing = await prisma.attendance.findFirst({
      where: { schoolId: req.schoolId, studentId, date: attendanceDate },
    });

    const record = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { status, markedByUserId: req.auth.userId },
        })
      : await prisma.attendance.create({
          data: {
            schoolId: req.schoolId,
            studentId,
            date: attendanceDate,
            status,
            markedByUserId: req.auth.userId,
          },
        });
    results.push(record);
  }

  return res.status(201).json({ attendance: results });
}

async function listAttendance(req, res) {
  const { studentId, classId, date, from, to } = req.query;
  const where = { schoolId: req.schoolId };
  if (studentId) where.studentId = studentId;
  if (date) where.date = new Date(date);
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  if (req.auth.role === 'parent') {
    where.student = { parentUserId: req.auth.userId };
  } else if (['teacher', 'staff'].includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (classId && !assignedClassIds.includes(classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
    where.student = { classId: classId ? classId : { in: assignedClassIds } };
  } else if (classId) {
    where.student = { classId };
  }

  const attendance = await prisma.attendance.findMany({
    where,
    include: { student: true },
    orderBy: { date: 'desc' },
  });
  return res.json({ attendance });
}

module.exports = { markAttendance, listAttendance };
