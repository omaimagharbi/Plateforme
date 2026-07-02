import { Pool } from "pg";

// Échoue immédiatement avec un message clair si la variable n'est pas définie,
// plutôt que de laisser "pg" retomber silencieusement sur 127.0.0.1:5432.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL n'est pas définie. Sur Vercel : Settings → Environment Variables → " +
    "ajoutez DATABASE_URL avec la chaîne de connexion Neon, puis redéployez (Deployments → ⋯ → Redeploy)."
  );
}

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
