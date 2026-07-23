const prisma = require('../utils/prisma');

const MANAGE_ROLES = ['owner', 'admin'];

/**
 * Owner/admin see every leave request (optionally filtered by status);
 * everyone else only ever sees their own.
 */
async function listLeaveRequests(req, res) {
  const { status, userId } = req.query;
  const where = { schoolId: req.schoolId };

  if (MANAGE_ROLES.includes(req.auth.role)) {
    if (userId) where.userId = userId;
  } else {
    where.userId = req.auth.userId;
  }
  if (status) where.status = status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, role: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ requests });
}

async function createLeaveRequest(req, res) {
  const { fromDate, toDate, reason } = req.body;

  if (new Date(toDate) < new Date(fromDate)) {
    return res.status(400).json({ error: 'toDate must be on or after fromDate' });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      schoolId: req.schoolId,
      userId: req.auth.userId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
    },
  });
  return res.status(201).json({ request });
}

/**
 * Owner/admin approve or reject a request. A user may also cancel (delete)
 * their own still-pending request — handled by deleteLeaveRequest below.
 */
async function reviewLeaveRequest(req, res) {
  const existing = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Leave request not found' });

  const { status, reviewNotes } = req.body;
  const request = await prisma.leaveRequest.update({
    where: { id: existing.id },
    data: { status, reviewNotes, reviewedByUserId: req.auth.userId },
  });
  return res.json({ request });
}

async function deleteLeaveRequest(req, res) {
  const existing = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Leave request not found' });

  if (!MANAGE_ROLES.includes(req.auth.role)) {
    if (existing.userId !== req.auth.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Only a pending request can be cancelled' });
    }
  }

  await prisma.leaveRequest.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = { listLeaveRequests, createLeaveRequest, reviewLeaveRequest, deleteLeaveRequest };
