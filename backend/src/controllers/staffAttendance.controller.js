const prisma = require('../utils/prisma');

const MANAGE_ROLES = ['owner', 'admin'];

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

/**
 * Self check-in: the logged-in user marks themselves present for today.
 * One record per user per day — the unique constraint on
 * (userId, date) makes a duplicate same-day attempt a clean 409 rather
 * than a second silent row.
 */
async function markMyAttendance(req, res) {
  const date = todayDate();

  const existing = await prisma.staffAttendance.findUnique({
    where: { userId_date: { userId: req.auth.userId, date } },
  });
  if (existing) {
    return res.status(409).json({ error: 'Attendance already marked for today', attendance: existing });
  }

  const attendance = await prisma.staffAttendance.create({
    data: { schoolId: req.schoolId, userId: req.auth.userId, date },
  });
  return res.status(201).json({ attendance });
}

/**
 * Owner/admin see every staff member's check-ins (optionally filtered by
 * userId/date range); everyone else only ever sees their own.
 */
async function listStaffAttendance(req, res) {
  const { userId, from, to } = req.query;
  const where = { schoolId: req.schoolId };

  if (MANAGE_ROLES.includes(req.auth.role)) {
    if (userId) where.userId = userId;
  } else {
    where.userId = req.auth.userId;
  }

  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const attendance = await prisma.staffAttendance.findMany({
    where,
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { date: 'desc' },
  });
  return res.json({ attendance });
}

module.exports = { markMyAttendance, listStaffAttendance };
