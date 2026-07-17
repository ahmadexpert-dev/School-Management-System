const cron = require('node-cron');
const prisma = require('../utils/prisma');

// Neon's free tier suspends its compute after 5 minutes of no activity —
// the next query then pays a multi-second "cold start" to wake it back up,
// which shows up to users as a slow or failed login/save. A trivial query
// every 4 minutes keeps the compute warm during active hours without
// meaningfully affecting Neon usage/cost.
async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}

function scheduleKeepAliveJob() {
  cron.schedule('*/4 * * * *', async () => {
    try {
      await pingDatabase();
    } catch (err) {
      console.error('[keepAlive] ping failed', err);
    }
  });
}

module.exports = { scheduleKeepAliveJob, pingDatabase };
