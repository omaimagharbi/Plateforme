import { NextResponse } from "next/server";
import pool from "../../../../lib/db";
import { getUserIdFromCookies } from "../../../../lib/auth";
import { getOwnedProject } from "../../../../lib/projectAuth";
import { recordEvmSnapshot } from "../../../../lib/evmSnapshot";

export async function GET(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PATCH(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const existing = await getOwnedProject(userId, params.id);
  if (!existing) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const body = await req.json();
  const pv = body.pv ?? existing.pv;
  const ev = body.ev ?? existing.ev;
  const cycle = body.cycle ?? existing.cycle;

  const result = await pool.query(
    `update projects set pv = $1, ev = $2, cycle = $3 where id = $4
     returning id, nom, budget, duree, cycle, pv, ev, risk_sector, risks, elan, created_at`,
    [pv, ev, cycle, params.id]
  );

  await recordEvmSnapshot(params.id);

  return NextResponse.json({ project: result.rows[0] });
}

export async function DELETE(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const existing = await getOwnedProject(userId, params.id);
  if (!existing) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  await pool.query("delete from projects where id = $1", [params.id]);
  return NextResponse.json({ ok: true });
}
