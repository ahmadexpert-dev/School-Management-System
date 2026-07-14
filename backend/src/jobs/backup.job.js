const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.join(__dirname, '../../backups');
const RETENTION_COUNT = 7; // keep the last 7 daily backups, delete older ones

// pg_dump refuses to dump a server newer than itself (e.g. a managed host
// running Postgres 18 with only a Postgres 16 pg_dump installed locally).
// Override via PG_DUMP_BIN if the default on PATH is too old for your DB.
const PG_DUMP_BIN = process.env.PG_DUMP_BIN || 'pg_dump';

// Prisma's DATABASE_URL carries a `?schema=` query param that Prisma itself
// understands but pg_dump/libpq does not — strip it before shelling out.
function pgDumpConnectionString(databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

/**
 * Dumps the whole database with pg_dump in Postgres's custom format (-F c),
 * which is already compressed and restorable with a single `pg_restore`
 * command — no separate gzip step needed. Runs across all schools since
 * this is a full physical backup, not scoped to a tenant.
 */
async function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(BACKUP_DIR, `backup-${timestamp}.dump`);

  await execFileAsync(PG_DUMP_BIN, [pgDumpConnectionString(process.env.DATABASE_URL), '-F', 'c', '-f', filePath]);

  await pruneOldBackups();
  return filePath;
}

async function pruneOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.dump'))
    .sort()
    .reverse();

  for (const file of files.slice(RETENTION_COUNT)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  }
}

/**
 * Registers the daily 2am backup. Call once from server.js at startup.
 * To restore: pg_restore --clean --if-exists -d <DATABASE_URL> <dump file>
 */
function scheduleBackupJob() {
  cron.schedule('0 2 * * *', async () => {
    try {
      const filePath = await runBackup();
      console.log(`[backup] wrote ${filePath}`);
    } catch (err) {
      console.error('[backup] job failed', err);
    }
  });
}

module.exports = { scheduleBackupJob, runBackup };
