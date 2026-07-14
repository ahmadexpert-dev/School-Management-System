const prisma = require('../utils/prisma');
const { calculateStudentFee } = require('../services/fee.service');

async function listFeeRecords(req, res) {
  const { studentId, month, status, classId } = req.query;
  const where = { schoolId: req.schoolId };
  if (studentId) where.studentId = studentId;
  if (month) where.month = month;
  if (status) where.status = status;

  if (req.auth.role === 'parent') {
    where.student = { parentUserId: req.auth.userId };
  } else if (classId) {
    where.student = { classId };
  }

  const feeRecords = await prisma.feeRecord.findMany({
    where,
    include: { student: { include: { class: true } } },
    orderBy: [{ month: 'desc' }, { student: { name: 'asc' } }],
  });
  return res.json({ feeRecords });
}

/**
 * Generates a FeeRecord for every student for the given month, using
 * calculateStudentFee (class standardFee unless a customFeeOverride is set).
 * Skips students who already have a record for that month.
 */
async function generateMonthlyFees(req, res) {
  const { month, dueDate, classId } = req.body;

  const students = await prisma.student.findMany({
    where: { schoolId: req.schoolId, ...(classId && { classId }) },
  });

  const created = [];
  for (const student of students) {
    const exists = await prisma.feeRecord.findFirst({
      where: { schoolId: req.schoolId, studentId: student.id, month },
    });
    if (exists) continue;

    const amountDue = await calculateStudentFee(student.id, req.schoolId);
    const record = await prisma.feeRecord.create({
      data: {
        schoolId: req.schoolId,
        studentId: student.id,
        month,
        amountDue,
        dueDate: new Date(dueDate),
      },
    });
    created.push(record);
  }

  return res.status(201).json({ createdCount: created.length, feeRecords: created });
}

/**
 * Admin can always manually set a FeeRecord's status/amountPaid regardless
 * of automated calculation — no automation blocks this override.
 */
async function updateFeeRecord(req, res) {
  const existing = await prisma.feeRecord.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Fee record not found' });

  const { amountPaid, status, paidDate } = req.body;

  const record = await prisma.feeRecord.update({
    where: { id: existing.id },
    data: {
      ...(amountPaid !== undefined && { amountPaid }),
      ...(status !== undefined && { status }),
      ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
    },
  });
  return res.json({ feeRecord: record });
}

module.exports = { listFeeRecords, generateMonthlyFees, updateFeeRecord };
