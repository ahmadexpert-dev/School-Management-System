const prisma = require('../utils/prisma');

async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    where: { schoolId: req.schoolId },
    include: { _count: { select: { staff: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ departments });
}

async function createDepartment(req, res) {
  const { name } = req.body;
  const existing = await prisma.department.findFirst({ where: { schoolId: req.schoolId, name } });
  if (existing) return res.status(409).json({ error: 'Department already exists' });

  const department = await prisma.department.create({ data: { schoolId: req.schoolId, name } });
  return res.status(201).json({ department });
}

async function updateDepartment(req, res) {
  const existing = await prisma.department.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Department not found' });

  const department = await prisma.department.update({
    where: { id: existing.id },
    data: { name: req.body.name },
  });
  return res.json({ department });
}

async function deleteDepartment(req, res) {
  const existing = await prisma.department.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Department not found' });

  // Unassign any staff in this department rather than blocking the delete —
  // a department going away shouldn't take employee records down with it.
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { departmentId: existing.id }, data: { departmentId: null } }),
    prisma.department.delete({ where: { id: existing.id } }),
  ]);
  return res.status(204).send();
}

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };
