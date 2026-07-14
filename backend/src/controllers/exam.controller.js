const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

async function listExams(req, res) {
  const { classId } = req.query;
  const where = { schoolId: req.schoolId, ...(classId && { classId }) };

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (classId && !assignedClassIds.includes(classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
    where.classId = classId ? classId : { in: assignedClassIds };
  }

  const exams = await prisma.exam.findMany({
    where,
    include: { class: true, subjects: true },
    orderBy: { date: 'desc' },
  });
  return res.json({ exams });
}

/**
 * Exam creation is open to teacher/staff too (not just owner/admin), but
 * only for a class they're assigned to via ClassTeacher.
 */
async function createExam(req, res) {
  const { classId, examName, term, date } = req.body;

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (!assignedClassIds.includes(classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
  }

  const exam = await prisma.exam.create({
    data: { schoolId: req.schoolId, classId, examName, term, date: new Date(date) },
  });
  return res.status(201).json({ exam });
}

/**
 * Corrects an exam's name/term/date after the fact (e.g. a typo). classId
 * is intentionally not editable here — moving an exam to a different class
 * would orphan its subjects/grades against student rosters that no longer
 * match; delete and recreate instead if the wrong class was picked.
 */
async function updateExam(req, res) {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const { examName, term, date } = req.body;
  const updated = await prisma.exam.update({
    where: { id: exam.id },
    data: {
      ...(examName !== undefined && { examName }),
      ...(term !== undefined && { term }),
      ...(date !== undefined && { date: new Date(date) }),
    },
  });
  return res.json({ exam: updated });
}

/**
 * Deletes an exam and everything entered under it (subjects, grades) —
 * there's no FK cascade in the schema, so this is done explicitly in a
 * transaction to avoid leaving orphaned rows.
 */
async function deleteExam(req, res) {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  await prisma.$transaction([
    prisma.grade.deleteMany({ where: { examId: exam.id } }),
    prisma.examSubject.deleteMany({ where: { examId: exam.id } }),
    prisma.exam.delete({ where: { id: exam.id } }),
  ]);
  return res.status(204).send();
}

async function assertExamAccess(req, exam) {
  if (!exam) return { ok: false, status: 404, error: 'Exam not found' };
  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (!assignedClassIds.includes(exam.classId)) {
      return { ok: false, status: 403, error: 'Forbidden: not your assigned class' };
    }
  }
  return { ok: true };
}

/**
 * Defines the subjects (with their total marks) for an exam, once, up
 * front. Body: { subjects: [{ subject, totalMarks }] }. Upserts so adding
 * more subjects later, or correcting a total, doesn't duplicate rows.
 */
async function addExamSubjects(req, res) {
  const examId = req.params.id;
  const { subjects } = req.body;

  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const results = [];
  for (const { subject, totalMarks } of subjects) {
    const examSubject = await prisma.examSubject.upsert({
      where: { examId_subject: { examId, subject } },
      update: { totalMarks },
      create: { schoolId: req.schoolId, examId, subject, totalMarks },
    });
    results.push(examSubject);
  }
  return res.status(201).json({ subjects: results });
}

async function listExamSubjects(req, res) {
  const examId = req.params.id;
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const subjects = await prisma.examSubject.findMany({
    where: { schoolId: req.schoolId, examId },
    orderBy: { subject: 'asc' },
  });
  return res.json({ subjects });
}

/**
 * Corrects one subject's name/totalMarks (e.g. a typo). Grade.subject is a
 * plain string, not a foreign key, so renaming here also renames it on any
 * grades already entered for this subject — otherwise they'd silently stop
 * matching this ExamSubject and drop out of the result card.
 */
async function updateExamSubject(req, res) {
  const { id: examId, subjectId } = req.params;
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const existing = await prisma.examSubject.findFirst({ where: { id: subjectId, examId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Subject not found' });

  const { subject, totalMarks } = req.body;
  const [updated] = await prisma.$transaction([
    prisma.examSubject.update({
      where: { id: existing.id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(totalMarks !== undefined && { totalMarks }),
      },
    }),
    ...(subject !== undefined && subject !== existing.subject
      ? [prisma.grade.updateMany({ where: { examId, subject: existing.subject }, data: { subject } })]
      : []),
    ...(totalMarks !== undefined
      ? [prisma.grade.updateMany({ where: { examId, subject: subject ?? existing.subject }, data: { totalMarks } })]
      : []),
  ]);
  return res.json({ subject: updated });
}

/**
 * Deletes a subject definition and any grades already entered under it.
 */
async function deleteExamSubject(req, res) {
  const { id: examId, subjectId } = req.params;
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  const access = await assertExamAccess(req, exam);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const existing = await prisma.examSubject.findFirst({ where: { id: subjectId, examId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Subject not found' });

  await prisma.$transaction([
    prisma.grade.deleteMany({ where: { examId, subject: existing.subject } }),
    prisma.examSubject.delete({ where: { id: existing.id } }),
  ]);
  return res.status(204).send();
}

module.exports = {
  listExams,
  createExam,
  updateExam,
  deleteExam,
  addExamSubjects,
  listExamSubjects,
  updateExamSubject,
  deleteExamSubject,
};
