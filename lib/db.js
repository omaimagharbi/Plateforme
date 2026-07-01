import { Pool } from "pg";

// Réutilise le pool entre les rechargements en dev (évite d'épuiser les connexions)
const globalForPg = globalThis;

const pool =
  globalForPg._nexusPgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._nexusPgPool = pool;
}

export default pool;
