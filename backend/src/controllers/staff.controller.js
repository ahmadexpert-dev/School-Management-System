const prisma = require('../utils/prisma');

// Generates the next sequential "EMP0001"-style code for a school, based on
// the highest existing code number rather than the current staff count —
// counting rows breaks the moment any staff member has ever been deleted
// (see the identical fix on the student admission code for the full story).
async function generateEmployeeCode(schoolId) {
  const staff = await prisma.staff.findMany({ where: { schoolId }, select: { employeeCode: true } });
  let max = 0;
  for (const s of staff) {
    if (!s.employeeCode) continue;
    const num = parseInt(s.employeeCode.slice(3), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `EMP${String(max + 1).padStart(4, '0')}`;
}

async function listStaff(req, res) {
  const staff = await prisma.staff.findMany({
    where: { schoolId: req.schoolId },
    include: { department: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ staff });
}

async function createStaff(req, res) {
  const { name, role, subject, phone, email, salary, joiningDate, departmentId } = req.body;

  if (departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, schoolId: req.schoolId } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
  }

  const employeeCode = await generateEmployeeCode(req.schoolId);

  const staff = await prisma.staff.create({
    data: {
      schoolId: req.schoolId,
      name,
      role,
      subject,
      phone,
      email,
      salary,
      joiningDate: new Date(joiningDate),
      departmentId: departmentId || null,
      employeeCode,
    },
    include: { department: true },
  });
  return res.status(201).json({ staff });
}

async function updateStaff(req, res) {
  const existing = await prisma.staff.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Staff member not found' });

  const { name, role, subject, phone, email, salary, joiningDate, departmentId, status } = req.body;

  if (departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, schoolId: req.schoolId } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
  }

  const staff = await prisma.staff.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(subject !== undefined && { subject }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(salary !== undefined && { salary }),
      ...(joiningDate !== undefined && { joiningDate: new Date(joiningDate) }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(status !== undefined && { status }),
    },
    include: { department: true },
  });
  return res.json({ staff });
}

async function deleteStaff(req, res) {
  const existing = await prisma.staff.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Staff member not found' });

  await prisma.staff.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

async function uploadStaffPhoto(req, res) {
  const existing = await prisma.staff.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId },
  });
  if (!existing) return res.status(404).json({ error: 'Staff member not found' });
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  const photoUrl = `/uploads/staff/${req.file.filename}`;
  const staff = await prisma.staff.update({
    where: { id: existing.id },
    data: { photoUrl },
  });
  return res.json({ staff });
}

async function getStaffStats(req, res) {
  const { schoolId } = req;
  const [totalStaff, activeStaff, deactivatedStaff, totalDepartments] = await Promise.all([
    prisma.staff.count({ where: { schoolId } }),
    prisma.staff.count({ where: { schoolId, status: 'active' } }),
    prisma.staff.count({ where: { schoolId, status: 'inactive' } }),
    prisma.department.count({ where: { schoolId } }),
  ]);
  return res.json({ totalStaff, activeStaff, deactivatedStaff, totalDepartments });
}

module.exports = { listStaff, createStaff, updateStaff, deleteStaff, uploadStaffPhoto, getStaffStats };
