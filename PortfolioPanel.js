import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { getUserIdFromCookies } from "../../../lib/auth";

export async function GET() {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const result = await pool.query(
    `select id, nom, budget, duree, cycle, pv, ev, risk_sector, risks, elan, created_at
     from projects where user_id = $1 order by created_at desc`,
    [userId]
  );
  return NextResponse.json({ projects: result.rows });
}

export async function POST(req) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { nom, budget, duree, cycle } = await req.json();
  if (!nom || !budget || !duree) {
    return NextResponse.json({ error: "Nom, budget et durée sont requis." }, { status: 400 });
  }

  const result = await pool.query(
    `insert into projects (user_id, nom, budget, duree, cycle, pv, ev)
     values ($1, $2, $3, $4, $5, 30, 20)
     returning id, nom, budget, duree, cycle, pv, ev, risk_sector, risks, elan, created_at`,
    [userId, nom, budget, duree, cycle || "hybride"]
  );

  return NextResponse.json({ project: result.rows[0] });
}
