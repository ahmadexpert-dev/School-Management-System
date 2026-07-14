const cron = require('node-cron');
const prisma = require('../utils/prisma');
const { sendNotification } = require('../services/notification.service');

/**
 * Finds every FeeRecord that is unpaid/partial and past its dueDate, and
 * sends one reminder notification per record. Runs across all schools since
 * this is a system-level job, not a per-request handler (no JWT to scope
 * by) — it derives schoolId from each FeeRecord row directly.
 */
async function runFeeReminders() {
  const overdue = await prisma.feeRecord.findMany({
    where: {
      status: { in: ['unpaid', 'partial'] },
      dueDate: { lt: new Date() },
    },
    include: { student: true },
  });

  for (const record of overdue) {
    const balance = Number(record.amountDue) - Number(record.amountPaid);
    const message = `Fee reminder: ${record.student.name}'s ${record.month} fee of Rs. ${balance} is overdue. Please pay at your earliest convenience.`;
    await sendNotification({
      schoolId: record.schoolId,
      studentId: record.studentId,
      type: 'sms',
      message,
    });
  }

  return overdue.length;
}

/**
 * Registers the daily 8am cron. Call once from server.js at startup.
 */
function scheduleFeeReminderJob() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const count = await runFeeReminders();
      console.log(`[feeReminder] sent ${count} overdue fee reminders`);
    } catch (err) {
      console.error('[feeReminder] job failed', err);
    }
  });
}

module.exports = { scheduleFeeReminderJob, runFeeReminders };
