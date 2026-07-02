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
    `select id, titre, description, impact_budget, impact_duree, status, created_at, decided_at
     from change_requests where project_id = $1 order by created_at desc`,
    [params.id]
  );

  return NextResponse.json({ changes: result.rows });
}

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { titre, description, impactBudget, impactDuree } = await req.json();
  if (!titre) return NextResponse.json({ error: "Titre requis." }, { status: 400 });

  const result = await pool.query(
    `insert into change_requests (project_id, titre, description, impact_budget, impact_duree)
     values ($1, $2, $3, $4, $5)
     returning id, titre, description, impact_budget, impact_duree, status, created_at, decided_at`,
    [params.id, titre, description || "", Number(impactBudget) || 0, Number(impactDuree) || 0]
  );

  return NextResponse.json({ change: result.rows[0] });
}
