import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { nom, role, tauxHoraire, critical } = await req.json();
  if (!nom || !tauxHoraire) {
    return NextResponse.json({ error: "Nom et taux horaire requis." }, { status: 400 });
  }

  const result = await pool.query(
    `insert into team_members (project_id, nom, role, taux_horaire, critical, heures_semaine, heures_cumulees)
     values ($1, $2, $3, $4, $5, 0, 0)
     returning id, nom, role, taux_horaire, critical, heures_semaine, heures_cumulees`,
    [params.id, nom, role || "Collaborateur", tauxHoraire, !!critical]
  );

  return NextResponse.json({ member: result.rows[0] });
}
