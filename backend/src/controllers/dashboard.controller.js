const prisma = require('../utils/prisma');

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function lastNMonths(n) {
  const months = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    months.unshift(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

async function getCounts(schoolId) {
  const [students, teachers, staff, classes] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: 'teacher' } }),
    prisma.staff.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
  ]);
  return { students, teachers, staff, classes };
}

async function getAttendanceToday(schoolId) {
  const date = todayDate();
  const grouped = await prisma.attendance.groupBy({
    by: ['status'],
    where: { schoolId, date },
    _count: true,
  });
  const counts = { present: 0, absent: 0, leave: 0 };
  for (const g of grouped) counts[g.status] = g._count;
  return { date: date.toISOString().slice(0, 10), ...counts };
}

async function getFeesSummary(schoolId) {
  const months = lastNMonths(6);
  const [grouped, allTime, currentMonthUnpaid] = await Promise.all([
    prisma.feeRecord.groupBy({
      by: ['month'],
      where: { schoolId, month: { in: months } },
      _sum: { amountDue: true, amountPaid: true },
    }),
    prisma.feeRecord.aggregate({
      where: { schoolId },
      _sum: { amountDue: true, amountPaid: true },
    }),
    prisma.feeRecord.count({
      where: { schoolId, month: months[months.length - 1], status: { not: 'paid' } },
    }),
  ]);

  const byMonth = new Map(grouped.map((g) => [g.month, g]));
  const monthly = months.map((month) => {
    const g = byMonth.get(month);
    return {
      month,
      totalDue: Number(g?._sum.amountDue || 0),
      totalPaid: Number(g?._sum.amountPaid || 0),
    };
  });

  const totalDue = Number(allTime._sum.amountDue || 0);
  const totalPaid = Number(allTime._sum.amountPaid || 0);

  return {
    monthly,
    totalCollected: totalPaid,
    totalOutstanding: totalDue - totalPaid,
    studentsNotPaidThisMonth: currentMonthUnpaid,
  };
}

async function getTopPerformers(schoolId) {
  const exam = await prisma.exam.findFirst({
    where: { schoolId },
    orderBy: { date: 'desc' },
    include: { class: true },
  });
  if (!exam) return { exam: null, students: [] };

  const [subjects, students, grades] = await Promise.all([
    prisma.examSubject.findMany({ where: { schoolId, examId: exam.id } }),
    prisma.student.findMany({ where: { schoolId, classId: exam.classId } }),
    prisma.grade.findMany({ where: { schoolId, examId: exam.id } }),
  ]);

  const totalPossible = subjects.reduce((sum, s) => sum + Number(s.totalMarks), 0);
  const totalsByStudent = new Map();
  for (const g of grades) {
    totalsByStudent.set(g.studentId, (totalsByStudent.get(g.studentId) || 0) + Number(g.marksObtained));
  }

  const ranked = students
    .map((s) => ({
      studentId: s.id,
      studentName: s.name,
      percentage: totalPossible ? Math.round(((totalsByStudent.get(s.id) || 0) / totalPossible) * 1000) / 10 : null,
    }))
    .filter((s) => totalsByStudent.has(s.studentId))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  return {
    exam: { id: exam.id, examName: exam.examName, term: exam.term, className: exam.class.className },
    students: ranked,
  };
}

async function getSummary(req, res) {
  const { schoolId } = req;
  const [counts, attendanceToday, fees, topPerformers] = await Promise.all([
    getCounts(schoolId),
    getAttendanceToday(schoolId),
    getFeesSummary(schoolId),
    getTopPerformers(schoolId),
  ]);

  return res.json({ counts, attendanceToday, fees, topPerformers });
}

module.exports = { getSummary };
