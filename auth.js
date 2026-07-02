import pool from "./db";

// Renvoie une clé de semaine ISO stable, ex : "2026-W27".
function currentWeekKey() {
  const d = new Date();
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function teamAC(team) {
  return (team || []).reduce((s, m) => s + Number(m.taux_horaire) * Number(m.heures_cumulees || 0), 0);
}

// Enregistre (ou met à jour) l'instantané EVM de la semaine en cours pour ce projet.
// Appelé après toute modification qui affecte PV, EV ou AC.
export async function recordEvmSnapshot(projectId) {
  const projRes = await pool.query("select budget, pv, ev from projects where id = $1", [projectId]);
  const project = projRes.rows[0];
  if (!project) return;

  const teamRes = await pool.query(
    "select taux_horaire, heures_cumulees from team_members where project_id = $1",
    [projectId]
  );

  const budget = Number(project.budget);
  const PV = (budget * project.pv) / 100;
  const EV = (budget * project.ev) / 100;
  const AC = teamAC(teamRes.rows);

  const weekKey = currentWeekKey();
  await pool.query(
    `insert into evm_snapshots (project_id, week_key, pv, ev, ac)
     values ($1, $2, $3, $4, $5)
     on conflict (project_id, week_key)
     do update set pv = $3, ev = $4, ac = $5`,
    [projectId, weekKey, PV, EV, AC]
  );
}
