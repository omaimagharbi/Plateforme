import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { getUserIdFromCookies } from "../../../lib/auth";

function statusOf(cpi, spi) {
  const worst = Math.min(cpi, spi);
  if (worst < 0.9) return "red";
  if (worst < 1.0) return "amber";
  return "green";
}

export async function GET() {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const projRes = await pool.query(
    `select id, nom, budget, duree, cycle, pv, ev, risks from projects where user_id = $1 order by created_at desc`,
    [userId]
  );

  const projects = [];
  let totalBudget = 0, totalEAC = 0, redCount = 0, amberCount = 0, highRisks = 0;

  for (const p of projRes.rows) {
    const teamRes = await pool.query(
      "select taux_horaire, heures_cumulees from team_members where project_id = $1",
      [p.id]
    );
    const AC = Math.max(
      1,
      teamRes.rows.reduce((s, m) => s + Number(m.taux_horaire) * Number(m.heures_cumulees || 0), 0)
    );
    const budget = Number(p.budget);
    const PV = (budget * p.pv) / 100;
    const EV = (budget * p.ev) / 100;
    const CPI = EV / AC;
    const SPI = EV / PV;
    const EAC = CPI > 0 ? budget / CPI : budget;
    const health = statusOf(CPI, SPI);

    const risks = p.risks || [];
    const projectHighRisks = risks.filter((r) => r.probabilite * r.impact >= 15).length;

    totalBudget += budget;
    totalEAC += EAC;
    highRisks += projectHighRisks;
    if (health === "red") redCount++;
    if (health === "amber") amberCount++;

    projects.push({
      id: p.id, nom: p.nom, budget, duree: p.duree, cycle: p.cycle,
      cpi: CPI, spi: SPI, eac: EAC, health, highRisks: projectHighRisks,
    });
  }

  return NextResponse.json({
    projects,
    summary: {
      totalProjects: projects.length,
      totalBudget,
      totalEAC,
      totalOverrun: totalEAC - totalBudget,
      redCount, amberCount,
      highRisks,
    },
  });
}
