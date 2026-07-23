const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

/**
 * Bulk-enters marks for ONE subject across many students in one call. Body:
 * { examId, subject, marks: [{ studentId, marksObtained }] }
 * totalMarks is never taken from the client — it's looked up from the
 * ExamSubject defined for this exam, so a teacher only ever types the
 * subject's total once (when defining subjects), never per student.
 * Upserts per (studentId, examId, subject) so re-entry updates in place.
 */
async function enterGrades(req, res) {
  const { examId, subject, marks } = req.body;

  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (!assignedClassIds.includes(exam.classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
  }

  const examSubject = await prisma.examSubject.findFirst({
    where: { schoolId: req.schoolId, examId, subject },
  });
  if (!examSubject) {
    return res.status(400).json({ error: `Subject "${subject}" has not been added to this exam yet` });
  }
  const totalMarks = examSubject.totalMarks;

  const results = [];
  const skipped = [];
  for (const { studentId, marksObtained } of marks) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: req.schoolId, classId: exam.classId },
    });
    if (!student) continue;

    // marksObtained is already non-negative (validated at the schema
    // level) — this is the missing other half: marks can't exceed the
    // subject's total, or percentages/rankings downstream get corrupted.
    if (marksObtained > Number(totalMarks)) {
      skipped.push({ studentId, reason: `marksObtained (${marksObtained}) exceeds totalMarks (${totalMarks})` });
      continue;
    }

    const existing = await prisma.grade.findFirst({
      where: { schoolId: req.schoolId, studentId, examId, subject },
    });

    const grade = existing
      ? await prisma.grade.update({
          where: { id: existing.id },
          data: { marksObtained, totalMarks },
        })
      : await prisma.grade.create({
          data: { schoolId: req.schoolId, studentId, examId, subject, marksObtained, totalMarks },
        });
    results.push(grade);
  }

  return res.status(201).json({ grades: results, skipped });
}

async function listGrades(req, res) {
  const { studentId, examId } = req.query;
  const where = { schoolId: req.schoolId };
  if (studentId) where.studentId = studentId;
  if (examId) where.examId = examId;

  if (req.auth.role === 'parent') {
    where.student = { parentUserId: req.auth.userId };
  } else if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    where.student = { classId: { in: assignedClassIds } };
  }

  const grades = await prisma.grade.findMany({
    where,
    include: { student: true, exam: true },
    orderBy: { subject: 'asc' },
  });
  return res.json({ grades });
}

module.exports = { enterGrades, listGrades };
