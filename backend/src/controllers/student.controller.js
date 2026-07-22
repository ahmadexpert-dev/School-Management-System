const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { calculateStudentFee } = require('../services/fee.service');
const { getAssignedClassIds } = require('../middleware/classAccess.middleware');
const { hashPassword } = require('../utils/password.util');
const { sendEmail } = require('../services/email.service');

const FEE_FIELDS = ['customFeeOverride', 'discountType', 'discountNotes'];
const CLASS_SCOPED_ROLES = ['teacher', 'staff'];

const ADMISSION_DETAIL_FIELDS = [
  'gender',
  'dateOfBirth',
  'placeOfBirth',
  'bFormNumber',
  'religion',
  'surname',
  'fatherIdCard',
  'fatherEmail',
  'motherPhone',
  'whatsappNumber',
  'homeAddress',
  'previousSchool',
  'remarks',
];

// Generates the next sequential "ST0001"-style code for a school, based on
// the highest existing code number rather than the current student count —
// counting rows breaks the moment any student has ever been deleted (the
// count drops, so "count + 1" recomputes a number that's already in use and
// collides with the unique constraint). Scanning existing codes for the
// true max is correct regardless of deletions.
async function nextSequentialNumber(codes, prefix) {
  let max = 0;
  for (const code of codes) {
    if (!code) continue;
    const num = parseInt(code.slice(prefix.length), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return max + 1;
}

async function generateStudentCode(schoolId) {
  const students = await prisma.student.findMany({ where: { schoolId }, select: { studentCode: true } });
  const next = await nextSequentialNumber(students.map((s) => s.studentCode), 'ST');
  return `ST${String(next).padStart(4, '0')}`;
}

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url'); // ~8 url-safe chars
}

/**
 * Creates (or links to an existing) parent login for a student being
 * admitted, when the admission form's "Create parent account" toggle is on
 * and a father email was provided. Reuses an existing parent account in the
 * same school if the email is already registered, rather than erroring —
 * a second child admitted under the same parent shouldn't need a new login.
 */
async function createOrLinkParentAccount(schoolId, { fatherEmail, guardianName, studentName }) {
  if (!fatherEmail) return null;

  const existing = await prisma.user.findUnique({ where: { email: fatherEmail } });
  if (existing) {
    if (existing.schoolId !== schoolId || existing.role !== 'parent') {
      // Email belongs to someone else or a non-parent account — don't link.
      return null;
    }
    return { parentUserId: existing.id, created: false, email: existing.email };
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const parentUser = await prisma.user.create({
    data: {
      schoolId,
      name: guardianName || 'Parent',
      email: fatherEmail,
      passwordHash,
      role: 'parent',
    },
  });

  await sendEmail({
    to: fatherEmail,
    subject: 'Your parent portal login',
    html: `<p>An account has been created for you to track ${studentName}'s attendance, fees, and grades.</p>
<p><b>Email:</b> ${fatherEmail}<br/><b>Temporary password:</b> ${temporaryPassword}</p>
<p>Please log in and change your password.</p>`,
  });

  return { parentUserId: parentUser.id, created: true, email: fatherEmail, temporaryPassword };
}

// Staff has the same access as teacher (view students in assigned classes,
// mark attendance, enter grades) but must never see fee data.
function stripFeeFields(student) {
  const clean = { ...student };
  for (const field of FEE_FIELDS) delete clean[field];
  delete clean.effectiveFee;
  return clean;
}

/**
 * Demonstrates the multi-tenant rule: schoolId comes ONLY from req.schoolId
 * (set by scopeToSchool from the verified JWT), never from query/body/params.
 * Additionally scopes by role: parents only see their own children;
 * teacher/staff only see students in their assigned classes.
 */
async function listStudents(req, res) {
  const { classId } = req.query;
  const where = { schoolId: req.schoolId, ...(classId && { classId }) };

  if (req.auth.role === 'parent') {
    where.parentUserId = req.auth.userId;
  } else if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (classId && !assignedClassIds.includes(classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
    where.classId = classId ? classId : { in: assignedClassIds };
  }

  const students = await prisma.student.findMany({
    where,
    include: { class: true },
    orderBy: { name: 'asc' },
  });

  const result = req.auth.role === 'staff' ? students.map(stripFeeFields) : students;
  return res.json({ students: result });
}

async function getStudent(req, res) {
  const where = { id: req.params.id, schoolId: req.schoolId };
  if (req.auth.role === 'parent') where.parentUserId = req.auth.userId;

  const student = await prisma.student.findFirst({ where, include: { class: true } });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  if (CLASS_SCOPED_ROLES.includes(req.auth.role)) {
    const assignedClassIds = await getAssignedClassIds(req);
    if (!assignedClassIds.includes(student.classId)) {
      return res.status(403).json({ error: 'Forbidden: not your assigned class' });
    }
  }

  if (req.auth.role === 'staff') {
    return res.json({ student: stripFeeFields(student) });
  }

  const effectiveFee = await calculateStudentFee(student.id, req.schoolId);
  return res.json({ student: { ...student, effectiveFee } });
}

async function createStudent(req, res) {
  const {
    classId,
    name,
    section,
    admissionDate,
    guardianName,
    guardianPhone,
    customFeeOverride,
    discountType,
    discountNotes,
  } = req.body;

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const detailFields = {};
  for (const field of ADMISSION_DETAIL_FIELDS) {
    if (req.body[field] !== undefined) {
      detailFields[field] = field === 'dateOfBirth' ? new Date(req.body[field]) : req.body[field];
    }
  }

  let parentAccount = null;
  if (req.body.createParentAccount) {
    parentAccount = await createOrLinkParentAccount(req.schoolId, {
      fatherEmail: req.body.fatherEmail,
      guardianName,
      studentName: name,
    });
  }

  // Retries with a freshly recomputed code on a unique-constraint collision
  // (e.g. two admissions submitted at nearly the same moment) rather than
  // failing the whole admission outright.
  let student;
  for (let attempt = 0; attempt < 3; attempt++) {
    const studentCode = await generateStudentCode(req.schoolId);
    try {
      student = await prisma.student.create({
        data: {
          schoolId: req.schoolId,
          classId,
          name,
          section,
          admissionDate: new Date(admissionDate),
          guardianName,
          guardianPhone,
          customFeeOverride: customFeeOverride ?? null,
          discountType: discountType ?? 'none',
          discountNotes,
          studentCode,
          parentUserId: parentAccount?.parentUserId,
          ...detailFields,
        },
      });
      break;
    } catch (err) {
      const isCodeCollision = err.code === 'P2002' && err.meta?.target?.includes('studentCode');
      if (!isCodeCollision || attempt === 2) throw err;
    }
  }
  return res.status(201).json({ student, parentAccount });
}

async function updateStudent(req, res) {
  const existing = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  const {
    classId,
    name,
    section,
    admissionDate,
    guardianName,
    guardianPhone,
    customFeeOverride,
    discountType,
    discountNotes,
    status,
  } = req.body;

  if (classId) {
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
    if (!cls) return res.status(404).json({ error: 'Class not found' });
  }

  const detailFields = {};
  for (const field of ADMISSION_DETAIL_FIELDS) {
    if (req.body[field] !== undefined) {
      detailFields[field] = field === 'dateOfBirth' ? new Date(req.body[field]) : req.body[field];
    }
  }

  const student = await prisma.student.update({
    where: { id: existing.id },
    data: {
      ...(classId !== undefined && { classId }),
      ...(name !== undefined && { name }),
      ...(section !== undefined && { section }),
      ...(admissionDate !== undefined && { admissionDate: new Date(admissionDate) }),
      ...(guardianName !== undefined && { guardianName }),
      ...(guardianPhone !== undefined && { guardianPhone }),
      ...(customFeeOverride !== undefined && { customFeeOverride }),
      ...(discountType !== undefined && { discountType }),
      ...(discountNotes !== undefined && { discountNotes }),
      ...(status !== undefined && { status }),
      ...detailFields,
    },
  });
  return res.json({ student });
}

async function deleteStudent(req, res) {
  const existing = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  // Historical records reference the student with a RESTRICT foreign key
  // (by design — an accidental cascade shouldn't silently wipe attendance/
  // fee/grade history). An explicit "delete student" therefore has to
  // deliberately clear those first; deactivating (Student.status) is the
  // path that preserves history instead of this one.
  await prisma.$transaction([
    prisma.grade.deleteMany({ where: { studentId: existing.id, schoolId: req.schoolId } }),
    prisma.attendance.deleteMany({ where: { studentId: existing.id, schoolId: req.schoolId } }),
    prisma.feeRecord.deleteMany({ where: { studentId: existing.id, schoolId: req.schoolId } }),
    prisma.notificationLog.deleteMany({ where: { studentId: existing.id, schoolId: req.schoolId } }),
    prisma.student.delete({ where: { id: existing.id } }),
  ]);
  return res.status(204).send();
}

/**
 * Bulk year-end promotion: moves the given students from one class to
 * another in one call. Only students explicitly listed are moved — a
 * repeating student is simply left off studentIds — so nothing happens
 * to a class's roster unless an owner/admin selects it.
 */
async function promoteStudents(req, res) {
  const { fromClassId, toClassId, studentIds } = req.body;

  const [fromClass, toClass] = await Promise.all([
    prisma.class.findFirst({ where: { id: fromClassId, schoolId: req.schoolId } }),
    prisma.class.findFirst({ where: { id: toClassId, schoolId: req.schoolId } }),
  ]);
  if (!fromClass) return res.status(404).json({ error: 'Source class not found' });
  if (!toClass) return res.status(404).json({ error: 'Destination class not found' });

  const result = await prisma.student.updateMany({
    where: { id: { in: studentIds }, schoolId: req.schoolId, classId: fromClassId },
    data: { classId: toClassId },
  });
  return res.json({ promotedCount: result.count });
}

/**
 * Admits several students into the same class/section in one request —
 * the manual multi-row equivalent of the reference product's bulk-admit
 * screen. Each row becomes its own Student row with a sequential
 * studentCode; nothing is shared between rows besides class/section.
 */
async function bulkAdmitStudents(req, res) {
  const { classId, section, students } = req.body;

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const existing = await prisma.student.findMany({ where: { schoolId: req.schoolId }, select: { studentCode: true } });
  const startNumber = await nextSequentialNumber(existing.map((s) => s.studentCode), 'ST');

  const created = await prisma.$transaction(
    students.map((s, i) =>
      prisma.student.create({
        data: {
          schoolId: req.schoolId,
          classId,
          section,
          name: s.name,
          gender: s.gender,
          guardianName: s.guardianName,
          fatherIdCard: s.fatherIdCard,
          guardianPhone: s.guardianPhone,
          motherPhone: s.motherPhone,
          dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : undefined,
          homeAddress: s.homeAddress,
          customFeeOverride: s.customFeeOverride ?? null,
          discountNotes: s.discountNotes,
          admissionDate: new Date(s.admissionDate || new Date()),
          studentCode: `ST${String(startNumber + i).padStart(4, '0')}`,
        },
      })
    )
  );

  return res.status(201).json({ students: created });
}

/**
 * Powers the Admission Reports screen: today/this-month/this-year admission
 * counts plus active vs. deactivated totals, all computed with Prisma
 * aggregates rather than fetching every student row.
 */
async function getAdmissionStats(req, res) {
  const { schoolId } = req;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [admissionsToday, admissionsThisMonth, admissionsThisYear, activeStudents, deactivatedStudents] =
    await Promise.all([
      prisma.student.count({ where: { schoolId, admissionDate: { gte: startOfToday } } }),
      prisma.student.count({ where: { schoolId, admissionDate: { gte: startOfMonth } } }),
      prisma.student.count({ where: { schoolId, admissionDate: { gte: startOfYear } } }),
      prisma.student.count({ where: { schoolId, status: 'active' } }),
      prisma.student.count({ where: { schoolId, status: 'inactive' } }),
    ]);

  return res.json({
    admissionsToday,
    admissionsThisMonth,
    admissionsThisYear,
    activeStudents,
    deactivatedStudents,
  });
}

async function uploadStudentPhoto(req, res) {
  const existing = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  const photoUrl = `/uploads/students/${req.file.filename}`;
  const student = await prisma.student.update({
    where: { id: existing.id },
    data: { photoUrl },
  });
  return res.json({ student });
}

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  promoteStudents,
  bulkAdmitStudents,
  getAdmissionStats,
  uploadStudentPhoto,
};
