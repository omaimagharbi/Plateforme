import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";
import { getUserIdFromCookies } from "../../../../../lib/auth";
import { getOwnedProject } from "../../../../../lib/projectAuth";
import { computeCPM } from "../../../../../lib/cpm";
import { callClaude } from "../../../../../lib/claude";

const SYSTEM_PROMPT = `Tu es le moteur IA "Explicabilité" de la plateforme NEXUS, un copilote PMP. On te donne un instantané chiffré et factuel d'un projet (indicateurs EVM, tâches critiques, équipe). Rédige une explication causale courte (2 à 4 phrases, en français) qui répond à la question "pourquoi ces indicateurs sont-ils à ce niveau ?".
Règles impératives :
- Base-toi STRICTEMENT sur les données fournies. N'invente jamais un chiffre, un nom ou un fait absent des données.
- Si les données ne permettent pas d'identifier une cause précise, dis-le honnêtement plutôt que de spéculer.
- Cite les noms concrets fournis (tâches, membres de l'équipe) quand ils sont pertinents pour l'explication.
- Ton professionnel, direct, orienté action (pas de généralités vagues type "plusieurs facteurs peuvent expliquer...").
Réponds STRICTEMENT en JSON valide, sans texte avant/après, sans balises markdown, au format exact :
{"explanation":"texte de l'explication"}`;

export async function POST(req, { params }) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await getOwnedProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const tasksRes = await pool.query(
    `select id, nom, duree, status, depends_on from tasks where project_id = $1 order by wbs_order asc`,
    [params.id]
  );
  const tasks = tasksRes.rows.map((t) => ({ ...t, depends_on: t.depends_on || [] }));
  const { tasks: withCpm } = computeCPM(tasks);
  const criticalStuck = withCpm
    .filter((t) => t.critical && t.status !== "done")
    .map((t) => ({ nom: t.nom, statut: t.status, duree_jours: t.duree }));

  const snapRes = await pool.query(
    `select week_key, pv, ev, ac from evm_snapshots where project_id = $1 order by week_key desc limit 2`,
    [params.id]
  );
  const snaps = snapRes.rows;

  const team = project.team || [];
  const budget = Number(project.budget);
  const AC = Math.max(
    1,
    team.reduce((s, m) => s + Number(m.taux_horaire) * Number(m.heures_cumulees || 0), 0)
  );
  const PV = (budget * project.pv) / 100;
  const EV = (budget * project.ev) / 100;
  const CPI = EV / AC;
  const SPI = EV / PV;

  // Les membres qui pèsent le plus dans le coût réel (AC) actuel — signal utile pour
  // expliquer un CPI dégradé sans jamais faire de supposition psychologique sur qui que ce soit.
  const teamByCost = [...team]
    .map((m) => ({
      nom: m.nom,
      role: m.role,
      cout_cumule: Math.round(Number(m.taux_horaire) * Number(m.heures_cumulees || 0)),
      marque_critique: !!m.critical,
    }))
    .sort((a, b) => b.cout_cumule - a.cout_cumule)
    .slice(0, 3);

  const snapshot = {
    indicateurs: {
      CPI: Number(CPI.toFixed(2)),
      SPI: Number(SPI.toFixed(2)),
      avancement_planifie_pct: project.pv,
      avancement_reel_pct: project.ev,
      cout_reel_estime_AC: Math.round(AC),
      budget_total: Math.round(budget),
    },
    tendance_recente:
      snaps.length === 2
        ? { semaine_precedente: snaps[1], semaine_courante: snaps[0] }
        : "Pas assez d'historique (moins de 2 semaines de données) pour dégager une tendance.",
    taches_critiques_non_terminees: criticalStuck,
    principaux_contributeurs_au_cout: teamByCost,
  };

  let result;
  try {
    result = await callClaude(
      SYSTEM_PROMPT,
      `Voici les données du projet "${project.nom}" :\n${JSON.stringify(snapshot, null, 2)}`
    );
  } catch (e) {
    return NextResponse.json({ error: "La génération a échoué. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ explanation: result.explanation || "" });
}
