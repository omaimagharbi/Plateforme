import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";

export async function GET(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const result = await pool.query(
    `select week_key, pv, ev, ac from evm_snapshots
     where project_id = $1 order by week_key asc`,
    [params.id]
  );

  return NextResponse.json({ snapshots: result.rows });
}
