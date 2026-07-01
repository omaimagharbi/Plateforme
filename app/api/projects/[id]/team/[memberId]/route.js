import { NextResponse } from "next/server";
import pool from "../../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../../lib/auth";
import { getOwnedProject } from "../../../../../../lib/projectAuth";

// Body: { action: "setHeuresSemaine", value } ou { action: "logSemaine" }
export async function PATCH(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const member = project.team.find((m) => String(m.id) === String(params.memberId));
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const { action, value } = await req.json();

  let result;
  if (action === "setHeuresSemaine") {
    result = await pool.query(
      `update team_members set heures_semaine = $1 where id = $2
       returning id, nom, role, taux_horaire, critical, heures_semaine, heures_cumulees`,
      [value ?? 0, params.memberId]
    );
  } else if (action === "logSemaine") {
    // Ajoute les heures de la semaine au cumul, puis remet le compteur hebdo à zéro.
    result = await pool.query(
      `update team_members
       set heures_cumulees = heures_cumulees + heures_semaine,
           heures_semaine = 0
       where id = $1
       returning id, nom, role, taux_horaire, critical, heures_semaine, heures_cumulees`,
      [params.memberId]
    );
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ member: result.rows[0] });
}

export async function DELETE(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  await pool.query("delete from team_members where id = $1 and project_id = $2", [
    params.memberId,
    params.id,
  ]);

  return NextResponse.json({ ok: true });
}
