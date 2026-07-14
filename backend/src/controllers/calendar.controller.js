const prisma = require('../utils/prisma');

async function listEvents(req, res) {
  const { from, to } = req.query;
  const where = { schoolId: req.schoolId };
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  return res.json({ events });
}

async function createEvent(req, res) {
  const { title, description, date, endDate, type } = req.body;
  const event = await prisma.calendarEvent.create({
    data: {
      schoolId: req.schoolId,
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      type,
      createdByUserId: req.auth.userId,
    },
  });
  return res.status(201).json({ event });
}

async function updateEvent(req, res) {
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const { title, description, date, endDate, type } = req.body;
  const event = await prisma.calendarEvent.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(type !== undefined && { type }),
    },
  });
  return res.json({ event });
}

async function deleteEvent(req, res) {
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  await prisma.calendarEvent.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };
