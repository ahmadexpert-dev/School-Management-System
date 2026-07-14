const prisma = require('../utils/prisma');

/**
 * Everyone sees notices with no audience restriction (audienceRoles empty),
 * plus any notice specifically targeted at their own role.
 */
async function listNotices(req, res) {
  const notices = await prisma.notice.findMany({
    where: {
      schoolId: req.schoolId,
      OR: [{ audienceRoles: { isEmpty: true } }, { audienceRoles: { has: req.auth.role } }],
    },
    include: { postedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ notices });
}

async function createNotice(req, res) {
  const { title, content, audienceRoles } = req.body;
  const notice = await prisma.notice.create({
    data: {
      schoolId: req.schoolId,
      title,
      content,
      audienceRoles: audienceRoles || [],
      postedByUserId: req.auth.userId,
    },
  });
  return res.status(201).json({ notice });
}

async function deleteNotice(req, res) {
  const existing = await prisma.notice.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Notice not found' });

  await prisma.notice.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = { listNotices, createNotice, deleteNotice };
