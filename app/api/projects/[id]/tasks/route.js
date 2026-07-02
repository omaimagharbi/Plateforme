import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { computeCPM } from "../../../../../lib/cpm";

export async function GET(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const result = await pool.query(
    `select id, nom, duree, status, depends_on, wbs_order
     from tasks where project_id = $1 order by wbs_order asc`,
    [params.id]
  );

  const tasks = result.rows.map((t) => ({ ...t, depends_on: t.depends_on || [] }));
  const { tasks: withCpm, makespan } = computeCPM(tasks);

  return NextResponse.json({ tasks: withCpm, makespan });
}

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { nom, duree, dependsOn } = await req.json();
  if (!nom || !duree) {
    return NextResponse.json({ error: "Nom et durée sont requis." }, { status: 400 });
  }

  // On ne garde que les dépendances qui appartiennent bien à ce projet (sécurité).
  let validDeps = [];
  if (Array.isArray(dependsOn) && dependsOn.length) {
    const existing = await pool.query(
      `select id from tasks where project_id = $1 and id = any($2::int[])`,
      [params.id, dependsOn]
    );
    validDeps = existing.rows.map((r) => r.id);
  }

  const result = await pool.query(
    `insert into tasks (project_id, nom, duree, status, depends_on)
     values ($1, $2, $3, 'todo', $4)
     returning id, nom, duree, status, depends_on, wbs_order`,
    [params.id, nom, duree, JSON.stringify(validDeps)]
  );

  return NextResponse.json({ task: result.rows[0] });
}
