import { NextResponse } from "next/server";
import pool from "../../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../../lib/auth";
import { getOwnedProject } from "../../../../../../lib/projectAuth";
import { recordEvmSnapshot } from "../../../../../../lib/evmSnapshot";

export async function PATCH(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const changeRes = await pool.query(
    "select * from change_requests where id = $1 and project_id = $2",
    [params.changeId, params.id]
  );
  const change = changeRes.rows[0];
  if (!change) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  if (change.status !== "pending") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  const { decision } = await req.json(); // "approved" | "rejected"
  if (!["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
  }

  await pool.query(
    "update change_requests set status = $1, decided_at = now() where id = $2",
    [decision, params.changeId]
  );

  if (decision === "approved") {
    // Applique l'impact au budget et à la durée du projet — traçabilité PMI :
    // le périmètre ne bouge jamais sans passer par ce contrôle formel.
    await pool.query(
      `update projects set budget = budget + $1, duree = duree + $2 where id = $3`,
      [change.impact_budget, change.impact_duree, params.id]
    );
    await recordEvmSnapshot(params.id);
  }

  const updated = await pool.query(
    `select id, titre, description, impact_budget, impact_duree, status, created_at, decided_at
     from change_requests where id = $1`,
    [params.changeId]
  );
  const projRes = await pool.query(
    `select id, nom, budget, duree, cycle, pv, ev, risk_sector, risks, elan, created_at
     from projects where id = $1`,
    [params.id]
  );

  return NextResponse.json({ change: updated.rows[0], project: projRes.rows[0] });
}
