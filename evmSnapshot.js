import pool from "./db";

// Renvoie le projet (avec son équipe) si et seulement s'il appartient à userId, sinon null.
export async function getOwnedProject(userId, projectId) {
  const projRes = await pool.query(
    `select id, user_id, nom, budget, duree, cycle, pv, ev, risk_sector, risks, elan, created_at
     from projects where id = $1 and user_id = $2`,
    [projectId, userId]
  );
  const project = projRes.rows[0];
  if (!project) return null;

  const teamRes = await pool.query(
    `select id, nom, role, taux_horaire, critical, heures_semaine, heures_cumulees
     from team_members where project_id = $1 order by id asc`,
    [projectId]
  );
  project.team = teamRes.rows;
  return project;
}
