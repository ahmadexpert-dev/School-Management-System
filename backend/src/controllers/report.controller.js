const prisma = require('../utils/prisma');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');

const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

/**
 * Fee collection summary for a given month: totals for paid/partial/unpaid
 * plus overall amountDue vs amountPaid. Aggregated in the database via
 * groupBy rather than pulling every FeeRecord row over the wire and
 * summing in JS — matters once a school has thousands of records/month.
 */
async function feeCollectionReport(req, res) {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month query param is required' });

  const grouped = await prisma.feeRecord.groupBy({
    by: ['status'],
    where: { schoolId: req.schoolId, month },
    _count: true,
    _sum: { amountDue: true, amountPaid: true },
  });

  const summary = { paid: 0, partial: 0, unpaid: 0, totalDue: 0, totalPaid: 0 };
  let recordCount = 0;
  for (const g of grouped) {
    summary[g.status] = g._count;
    summary.totalDue += Number(g._sum.amountDue || 0);
    summary.totalPaid += Number(g._sum.amountPaid || 0);
    recordCount += g._count;
  }

  return res.json({ month, recordCount, summary });
}

/**
 * Attendance percentage per class over an optional date range (defaults to
 * all recorded attendance). Runs in a fixed 2 queries regardless of how
 * many classes the school has — previously this queried attendance once
 * per class in a loop (1 + N round-trips), which scales badly as classes
 * are added, especially against a remote DB.
 */
async function attendanceReport(req, res) {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const [classes, records] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: req.schoolId } }),
    prisma.attendance.findMany({
      where: {
        schoolId: req.schoolId,
        ...(Object.keys(dateFilter).length && { date: dateFilter }),
      },
      select: { status: true, student: { select: { classId: true } } },
    }),
  ]);

  const statsByClassId = new Map();
  for (const r of records) {
    const classId = r.student.classId;
    if (!statsByClassId.has(classId)) statsByClassId.set(classId, { total: 0, present: 0 });
    const stats = statsByClassId.get(classId);
    stats.total += 1;
    if (r.status === 'present') stats.present += 1;
  }

  const report = classes.map((cls) => {
    const stats = statsByClassId.get(cls.id) || { total: 0, present: 0 };
    return {
      classId: cls.id,
      className: cls.className,
      totalRecords: stats.total,
      presentCount: stats.present,
      attendancePercent: stats.total ? Math.round((stats.present / stats.total) * 1000) / 10 : null,
    };
  });

  return res.json({ report });
}

/**
 * Per-student grade summary for a given exam: total marks obtained vs
 * total possible, and percentage.
 */
async function gradeReport(req, res) {
  const { examId } = req.query;
  if (!examId) return res.status(400).json({ error: 'examId query param is required' });

  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const grades = await prisma.grade.findMany({
    where: { schoolId: req.schoolId, examId },
    select: { studentId: true, marksObtained: true, totalMarks: true, student: { select: { name: true } } },
  });

  const byStudent = {};
  for (const g of grades) {
    if (!byStudent[g.studentId]) {
      byStudent[g.studentId] = { studentId: g.studentId, studentName: g.student.name, obtained: 0, total: 0 };
    }
    byStudent[g.studentId].obtained += Number(g.marksObtained);
    byStudent[g.studentId].total += Number(g.totalMarks);
  }

  const report = Object.values(byStudent).map((s) => ({
    ...s,
    percentage: s.total ? Math.round((s.obtained / s.total) * 1000) / 10 : null,
  }));

  return res.json({ exam, report });
}

/**
 * One-click result card for an entire class: every student in the exam's
 * class, every subject defined for the exam (via ExamSubject), each
 * student's marks per subject, total, percentage, and class rank. This is
 * the "one click, whole class" report a teacher generates after entering
 * marks — no per-student report generation needed.
 */
async function resultCardReport(req, res) {
  const { examId } = req.query;
  if (!examId) return res.status(400).json({ error: 'examId query param is required' });

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId: req.schoolId },
    include: { class: true },
  });
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (!assignedClassIds.includes(exam.classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
  }

  const [subjects, students, grades] = await Promise.all([
    prisma.examSubject.findMany({ where: { schoolId: req.schoolId, examId }, orderBy: { subject: 'asc' } }),
    prisma.student.findMany({ where: { schoolId: req.schoolId, classId: exam.classId }, orderBy: { name: 'asc' } }),
    prisma.grade.findMany({ where: { schoolId: req.schoolId, examId } }),
  ]);

  const totalPossible = subjects.reduce((sum, s) => sum + Number(s.totalMarks), 0);
  const gradesByStudent = new Map();
  for (const g of grades) {
    if (!gradesByStudent.has(g.studentId)) gradesByStudent.set(g.studentId, new Map());
    gradesByStudent.get(g.studentId).set(g.subject, Number(g.marksObtained));
  }

  const rows = students.map((student) => {
    const marksBySubject = gradesByStudent.get(student.id) || new Map();
    const marks = {};
    let totalObtained = 0;
    for (const s of subjects) {
      const obtained = marksBySubject.has(s.subject) ? marksBySubject.get(s.subject) : null;
      marks[s.subject] = obtained;
      totalObtained += obtained ?? 0;
    }
    return {
      studentId: student.id,
      studentName: student.name,
      marks,
      totalObtained,
      totalPossible,
      percentage: totalPossible ? Math.round((totalObtained / totalPossible) * 1000) / 10 : null,
    };
  });

  // Standard competition ranking (1224): ties share a rank, next rank skips accordingly.
  rows.sort((a, b) => b.totalObtained - a.totalObtained);
  let rank = 0;
  let lastScore = null;
  rows.forEach((row, i) => {
    if (row.totalObtained !== lastScore) {
      rank = i + 1;
      lastScore = row.totalObtained;
    }
    row.rank = rank;
  });

  return res.json({
    exam: { id: exam.id, examName: exam.examName, term: exam.term, date: exam.date },
    class: { id: exam.class.id, className: exam.class.className },
    subjects: subjects.map((s) => ({ subject: s.subject, totalMarks: Number(s.totalMarks) })),
    students: rows,
  });
}

function currentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Powers the "Class Wise Reports" screen: overall stat tiles (active
 * students/staff, all-time fee generated/due) plus a per-class breakdown
 * (enrollment, this month's fee, this month's attendance %) and a list of
 * this month's fee defaulters — all in one call so the report page loads
 * with a single request.
 */
async function classWiseReport(req, res) {
  const { schoolId } = req;
  const month = req.query.month || currentMonthString();
  const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
  const startOfNextMonth = new Date(startOfMonth);
  startOfNextMonth.setUTCMonth(startOfNextMonth.getUTCMonth() + 1);

  const [
    classes,
    studentStatusGroups,
    activeStaff,
    feeAllTime,
    feeThisMonthRecords,
    attendanceThisMonth,
  ] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, orderBy: { className: 'asc' } }),
    prisma.student.groupBy({ by: ['classId', 'status'], where: { schoolId }, _count: true }),
    prisma.staff.count({ where: { schoolId, status: 'active' } }),
    prisma.feeRecord.aggregate({ where: { schoolId }, _sum: { amountDue: true, amountPaid: true } }),
    prisma.feeRecord.findMany({
      where: { schoolId, month },
      select: {
        amountDue: true,
        amountPaid: true,
        status: true,
        studentId: true,
        student: { select: { id: true, name: true, classId: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: startOfMonth, lt: startOfNextMonth } },
      select: { status: true, student: { select: { classId: true } } },
    }),
  ]);

  const enrollByClassId = new Map();
  for (const g of studentStatusGroups) {
    if (!enrollByClassId.has(g.classId)) enrollByClassId.set(g.classId, { active: 0, inactive: 0 });
    enrollByClassId.get(g.classId)[g.status] = g._count;
  }

  const feeByClassId = new Map();
  const defaulters = [];
  for (const r of feeThisMonthRecords) {
    const classId = r.student.classId;
    if (!feeByClassId.has(classId)) feeByClassId.set(classId, { generated: 0, paid: 0 });
    const bucket = feeByClassId.get(classId);
    bucket.generated += Number(r.amountDue);
    bucket.paid += Number(r.amountPaid);
    if (r.status !== 'paid') {
      defaulters.push({
        studentId: r.studentId,
        studentName: r.student.name,
        classId,
        amountDue: Number(r.amountDue),
        amountPaid: Number(r.amountPaid),
        balance: Number(r.amountDue) - Number(r.amountPaid),
        status: r.status,
      });
    }
  }

  const attendanceByClassId = new Map();
  for (const r of attendanceThisMonth) {
    const classId = r.student.classId;
    if (!attendanceByClassId.has(classId)) attendanceByClassId.set(classId, { total: 0, present: 0 });
    const bucket = attendanceByClassId.get(classId);
    bucket.total += 1;
    if (r.status === 'present') bucket.present += 1;
  }

  const classNameById = new Map(classes.map((c) => [c.id, c.className]));
  const classWise = classes.map((cls) => {
    const enroll = enrollByClassId.get(cls.id) || { active: 0, inactive: 0 };
    const fee = feeByClassId.get(cls.id) || { generated: 0, paid: 0 };
    const att = attendanceByClassId.get(cls.id) || { total: 0, present: 0 };
    return {
      classId: cls.id,
      className: cls.className,
      activeStudents: enroll.active,
      deactivatedStudents: enroll.inactive,
      feeGenerated: fee.generated,
      feePaid: fee.paid,
      feeDue: fee.generated - fee.paid,
      attendancePercent: att.total ? Math.round((att.present / att.total) * 1000) / 10 : null,
    };
  });

  const totalActiveStudents = classWise.reduce((sum, c) => sum + c.activeStudents, 0);
  const totalFeeDueAllTime = Number(feeAllTime._sum.amountDue || 0) - Number(feeAllTime._sum.amountPaid || 0);

  return res.json({
    month,
    stats: {
      totalActiveStudents,
      totalActiveStaff: activeStaff,
      totalFeeGenerated: Number(feeAllTime._sum.amountDue || 0),
      totalFeeDue: totalFeeDueAllTime,
    },
    classWise,
    defaulters: defaulters.map((d) => ({ ...d, className: classNameById.get(d.classId) })),
  });
}

module.exports = {
  feeCollectionReport,
  attendanceReport,
  gradeReport,
  resultCardReport,
  classWiseReport,
};
