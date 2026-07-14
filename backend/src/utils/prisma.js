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
});
const adapter = new PrismaPg(pool);

// Single shared Prisma instance to avoid exhausting DB connections in dev (hot reload).
const prisma = global.__prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
