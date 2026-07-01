import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { callClaude } from "../../../../../lib/claude";

const SYSTEM_PROMPT = `Tu es le moteur IA "Risk Predictor" de la plateforme NEXUS, un copilote PMP. À partir d'une description d'objectif de projet, identifie le secteur et génère une matrice des risques PMP.
Réponds STRICTEMENT en JSON valide, sans aucun texte avant/après, sans balises markdown, au format exact :
{"secteur":"nom court du secteur","risks":[{"nom":"nom court du risque","probabilite":1-5,"impact":1-5,"mitigation":"stratégie d'atténuation en une phrase courte"}]}
Génère entre 4 et 6 risques réalistes et variés, conformes aux standards PMP.`;

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { description } = await req.json();
  if (!description) return NextResponse.json({ error: "Description requise." }, { status: 400 });

  let aiData;
  try {
    aiData = await callClaude(SYSTEM_PROMPT, `Objectif du projet : ${description}`);
  } catch (e) {
    return NextResponse.json({ error: "La génération a échoué. Réessayez." }, { status: 502 });
  }

  const result = await pool.query(
    `update projects set risk_sector = $1, risks = $2 where id = $3
     returning id, risk_sector, risks`,
    [aiData.secteur || "", JSON.stringify(aiData.risks || []), params.id]
  );

  return NextResponse.json({ project: result.rows[0] });
}
