const prisma = require('../utils/prisma');

/**
 * Returns the fee amount that applies to a student: their customFeeOverride
 * if set, otherwise their class's standardFee. Scoped by schoolId so a
 * student ID from another tenant can never be read.
 */
async function calculateStudentFee(studentId, schoolId) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: { class: true },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  if (student.customFeeOverride !== null && student.customFeeOverride !== undefined) {
    return student.customFeeOverride;
  }

  return student.class.standardFee;
}

module.exports = { calculateStudentFee };
