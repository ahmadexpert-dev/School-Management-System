const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Uses the pg driver adapter instead of Prisma's default Rust query engine
// binary. The binary engine's Tokio timer panics ("PANIC: timer has gone
// away") under CPU-throttled shared hosting (observed on Hostinger) — the
// driver adapter runs queries through plain node-postgres instead, which
// has no such dependency.
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  // Fail fast with a clear error instead of hanging until the frontend's
  // generic request timeout kicks in — makes a slow/blocked connection to
  // the DB visible in the server logs with its own distinct message.
  connectionTimeoutMillis: 8_000,
  // connectionTimeoutMillis only bounds acquiring a connection — a query
  // that hangs *after* connecting (observed live: requests stuck 30s+ with
  // no response at all) was previously unbounded. These two force a hard
  // ceiling on any individual query/statement regardless of where it hangs.
  statement_timeout: 10_000,
  query_timeout: 10_000,
  // Hostinger support confirmed the account is hitting "Max Processes"
  // pressure on this shared plan — a smaller pool and shorter idle lifetime
  // keeps our own footprint (concurrent connections, and Passenger process
  // instances spawned to serve them) as small as possible, per their own
  // "fewer parallel processes" guidance.
  max: 2,
  idleTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  // A pooled client emitting an error in the background (e.g. connection
  // dropped) would otherwise crash the whole process — log and move on.
  console.error('[pg pool] unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log(`[pg pool] new connection established at ${new Date().toISOString()}`);
});

const adapter = new PrismaPg(pool);

// Single shared Prisma instance to avoid exhausting DB connections in dev (hot reload).
const prisma = global.__prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
