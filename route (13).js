import { NextResponse } from "next/server";
import pool from "../../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../../lib/auth";
import { getOwnedProject } from "../../../../../../lib/projectAuth";

export async function PATCH(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const existingTask = await pool.query(
    "select id from tasks where id = $1 and project_id = $2",
    [params.taskId, params.id]
  );
  if (!existingTask.rows.length) {
    return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
  }

  const body = await req.json();
  const sets = [];
  const values = [];
  let i = 1;

  if (body.status !== undefined) {
    if (!["todo", "in_progress", "done"].includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    sets.push(`status = $${i++}`); values.push(body.status);
  }
  if (body.nom !== undefined) { sets.push(`nom = $${i++}`); values.push(body.nom); }
  if (body.duree !== undefined) { sets.push(`duree = $${i++}`); values.push(body.duree); }
  if (body.dependsOn !== undefined) {
    let validDeps = [];
    if (Array.isArray(body.dependsOn) && body.dependsOn.length) {
      // Empêche une tâche de dépendre d'elle-même, et ne garde que les tâches du projet.
      const filtered = body.dependsOn.filter((d) => Number(d) !== Number(params.taskId));
      const existing = await pool.query(
        `select id from tasks where project_id = $1 and id = any($2::int[])`,
        [params.id, filtered]
      );
      validDeps = existing.rows.map((r) => r.id);
    }
    sets.push(`depends_on = $${i++}`); values.push(JSON.stringify(validDeps));
  }

  if (!sets.length) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });

  values.push(params.taskId);
  const result = await pool.query(
    `update tasks set ${sets.join(", ")} where id = $${i}
     returning id, nom, duree, status, depends_on, wbs_order`,
    values
  );

  return NextResponse.json({ task: result.rows[0] });
}

export async function DELETE(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  // Retire cette tâche des dépendances des autres tâches avant de la supprimer,
  // pour ne jamais laisser une référence orpheline.
  const others = await pool.query("select id, depends_on from tasks where project_id = $1", [params.id]);
  for (const row of others.rows) {
    const deps = row.depends_on || [];
    if (deps.includes(Number(params.taskId))) {
      const newDeps = deps.filter((d) => d !== Number(params.taskId));
      await pool.query("update tasks set depends_on = $1 where id = $2", [JSON.stringify(newDeps), row.id]);
    }
  }

  await pool.query("delete from tasks where id = $1 and project_id = $2", [params.taskId, params.id]);
  return NextResponse.json({ ok: true });
}
