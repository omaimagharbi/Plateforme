import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { callClaude } from "../../../../../lib/claude";
import { computeCPM } from "../../../../../lib/cpm";

const SYSTEM_PROMPT = `Tu es le moteur IA "WBS Generator" de la plateforme NEXUS, un copilote PMP. À partir d'une description de projet, génère une structure de découpage de projet (WBS) réaliste : entre 6 et 12 tâches, avec leur durée en jours et leurs dépendances.
Réponds STRICTEMENT en JSON valide, sans aucun texte avant/après, sans balises markdown, au format exact :
{"tasks":[{"nom":"nom court de la tâche","duree":nombre_de_jours,"dependsOnIndex":[indices des tâches précédentes dont celle-ci dépend]}]}
Règle impérative : dependsOnIndex ne doit contenir QUE des indices de tâches qui apparaissent AVANT dans le tableau (index strictement inférieur à la position de la tâche courante, la première tâche a l'index 0). La première tâche doit avoir dependsOnIndex vide. Les durées doivent être réalistes (1 à 15 jours par tâche).`;

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { description } = await req.json();
  if (!description) return NextResponse.json({ error: "Description requise." }, { status: 400 });

  let aiData;
  try {
    aiData = await callClaude(SYSTEM_PROMPT, `Description du projet : ${description}`);
  } catch (e) {
    return NextResponse.json({ error: "La génération a échoué. Réessayez." }, { status: 502 });
  }

  const aiTasks = Array.isArray(aiData.tasks) ? aiData.tasks : [];
  if (!aiTasks.length) {
    return NextResponse.json({ error: "L'IA n'a renvoyé aucune tâche. Réessayez avec une description plus détaillée." }, { status: 502 });
  }

  // Insère les tâches dans l'ordre, en convertissant les indices IA en vrais ids DB.
  const indexToId = {};
  const inserted = [];
  for (let i = 0; i < aiTasks.length; i++) {
    const t = aiTasks[i];
    const rawDeps = Array.isArray(t.dependsOnIndex) ? t.dependsOnIndex : [];
    // Sécurité : n'accepte que des indices valides et strictement antérieurs.
    const validIndices = rawDeps.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < i);
    const dependsOn = validIndices.map((idx) => indexToId[idx]).filter(Boolean);

    const duree = Math.max(1, Math.round(Number(t.duree) || 1));
    const nom = String(t.nom || `Tâche ${i + 1}`).slice(0, 200);

    const result = await pool.query(
      `insert into tasks (project_id, nom, duree, status, depends_on)
       values ($1, $2, $3, 'todo', $4)
       returning id, nom, duree, status, depends_on, wbs_order`,
      [params.id, nom, duree, JSON.stringify(dependsOn)]
    );
    indexToId[i] = result.rows[0].id;
    inserted.push({ ...result.rows[0], depends_on: dependsOn });
  }

  const { tasks: withCpm, makespan } = computeCPM(inserted);
  return NextResponse.json({ tasks: withCpm, makespan });
}
