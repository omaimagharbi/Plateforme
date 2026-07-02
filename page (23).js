import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { fetchJiraIssues } from "../../../../../lib/jira";

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { domain, email, apiToken, projectKey } = await req.json();
  if (!domain || !email || !apiToken || !projectKey) {
    return NextResponse.json(
      { error: "Domaine, email, jeton API et clé de projet Jira sont requis." },
      { status: 400 }
    );
  }

  let issues;
  try {
    issues = await fetchJiraIssues({ domain, email, apiToken, projectKey });
  } catch (e) {
    return NextResponse.json({ error: `Connexion Jira impossible : ${e.message}` }, { status: 502 });
  }

  if (!issues.length) {
    return NextResponse.json({ error: "Aucun ticket trouvé pour cette clé de projet Jira." }, { status: 404 });
  }

  // Insère les tickets comme tâches, dans l'ordre, puis reconstitue les dépendances via les
  // clés Jira (une tâche ne peut dépendre que d'une tâche déjà importée avant elle dans la boucle).
  const keyToId = {};
  let imported = 0;
  for (const issue of issues) {
    const depIds = issue.blockedByKeys.map((k) => keyToId[k]).filter(Boolean);
    const result = await pool.query(
      `insert into tasks (project_id, nom, duree, status, depends_on)
       values ($1, $2, $3, 'todo', $4)
       returning id`,
      [params.id, `[${issue.key}] ${issue.nom}`.slice(0, 200), issue.duree, JSON.stringify(depIds)]
    );
    keyToId[issue.key] = result.rows[0].id;
    imported++;
  }

  return NextResponse.json({ imported });
}
