const prisma = require('../utils/prisma');

/**
 * Stub sender — no real SMS/WhatsApp provider is configured yet. Logs the
 * message and marks it 'sent' immediately so the rest of the app (fee
 * reminders, UI) can be built against a stable interface. Swap the body of
 * this function for a real Twilio/WhatsApp Business API call later; nothing
 * else needs to change.
 */
async function sendNotification({ schoolId, studentId, type, message }) {
  const log = await prisma.notificationLog.create({
    data: { schoolId, studentId, type, message, status: 'pending' },
  });

  console.log(`[notification:${type}] school=${schoolId} student=${studentId} :: ${message}`);

  const sent = await prisma.notificationLog.update({
    where: { id: log.id },
    data: { status: 'sent', sentAt: new Date() },
  });

  return sent;
}

module.exports = { sendNotification };
