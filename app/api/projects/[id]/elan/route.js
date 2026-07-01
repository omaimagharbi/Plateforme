import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { callClaude } from "../../../../../lib/claude";

const SYSTEM_PROMPT = `Tu es le moteur IA "Bouton Élan" de la plateforme NEXUS, un copilote PMP de gestion de crise projet. À partir d'une description de crise, résume l'impact sur le chemin critique et propose exactement 3 scénarios de sortie de crise.
Réponds STRICTEMENT en JSON valide, sans aucun texte avant/après, sans balises markdown, au format exact :
{"cheminCritique":"résumé en une phrase de l'impact sur le chemin critique","scenarios":[{"titre":"titre court","resume":"description en une phrase","reallocation":"comment les tâches/ressources sont réallouées","compromis":"le principal compromis ou risque"}]}
Les 3 scénarios doivent représenter des approches différentes (rapide mais risqué / équilibré / prudent mais plus lent).`;

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { description } = await req.json();
  if (!description) return NextResponse.json({ error: "Description requise." }, { status: 400 });

  let aiData;
  try {
    aiData = await callClaude(SYSTEM_PROMPT, `Situation de crise : ${description}`);
  } catch (e) {
    return NextResponse.json({ error: "Le recalcul a échoué. Réessayez." }, { status: 502 });
  }

  const result = await pool.query(
    `update projects set elan = $1 where id = $2 returning id, elan`,
    [JSON.stringify(aiData), params.id]
  );

  return NextResponse.json({ project: result.rows[0] });
}
