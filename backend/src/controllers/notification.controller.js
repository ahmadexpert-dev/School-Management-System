const prisma = require('../utils/prisma');

async function listNotifications(req, res) {
  const { studentId, status } = req.query;
  const where = { schoolId: req.schoolId };
  if (studentId) where.studentId = studentId;
  if (status) where.status = status;

  if (req.auth.role === 'parent') {
    where.student = { parentUserId: req.auth.userId };
  }

  const notifications = await prisma.notificationLog.findMany({
    where,
    include: { student: true },
    orderBy: { sentAt: 'desc' },
  });
  return res.json({ notifications });
}

module.exports = { listNotifications };
