"use client";
import { useState, useEffect, useCallback } from "react";

const fmtEUR = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const HEALTH_LABEL = { green: "SAIN", amber: "VIGILANCE", red: "ALERTE" };
const HEALTH_CLASS = { green: "status-green", amber: "status-amber", red: "status-red" };

export default function PortfolioPanel({ onOpenProject }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/portfolio");
    const d = await res.json();
    if (res.ok) setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: "var(--muted)", fontSize: 13 }}>Chargement du portfolio...</p>;
  if (!data || data.projects.length === 0) {
    return (
      <section>
        <h1 className="page-title">Portfolio PMO</h1>
        <p className="page-sub">Vue agrégée de tous les projets de l'organisation.</p>
        <div className="card"><p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Aucun projet à afficher pour l'instant.</p></div>
      </section>
    );
  }

  const { summary, projects } = data;

  return (
    <section>
      <h1 className="page-title">Portfolio PMO</h1>
      <p className="page-sub">Vue agrégée de la santé de tous les projets de l'organisation, en un coup d'œil.</p>

      <div className="grid3" style={{ marginBottom: 22 }}>
        <div className="card">
          <h3>Budget total du portefeuille</h3>
          <div className="stat-row" style={{ flexDirection: "column" }}>
            <div className="stat"><div className="v">{fmtEUR(summary.totalBudget)}</div><div className="l">Budget cumulé</div></div>
            <div className="stat" style={{ marginTop: 10 }}>
              <div className="v" style={{ color: summary.totalOverrun > 0 ? "var(--red)" : "var(--green)" }}>
                {(summary.totalOverrun >= 0 ? "+" : "") + fmtEUR(summary.totalOverrun)}
              </div>
              <div className="l">Dépassement projeté cumulé (EAC - budget)</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Santé du portefeuille</h3>
          <div className="stat-row" style={{ flexDirection: "column" }}>
            <div className="stat"><div className="v" style={{ color: "var(--red)" }}>{summary.redCount}</div><div className="l">Projet(s) en alerte</div></div>
            <div className="stat" style={{ marginTop: 10 }}><div className="v" style={{ color: "var(--amber)" }}>{summary.amberCount}</div><div className="l">Projet(s) en vigilance</div></div>
          </div>
        </div>
        <div className="card">
          <h3>Exposition aux risques</h3>
          <div className="stat-row" style={{ flexDirection: "column" }}>
            <div className="stat"><div className="v">{summary.totalProjects}</div><div className="l">Projets actifs</div></div>
            <div className="stat" style={{ marginTop: 10 }}><div className="v" style={{ color: summary.highRisks > 0 ? "var(--red)" : "var(--green)" }}>{summary.highRisks}</div><div className="l">Risques critiques cumulés (score ≥ 15)</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Détail par projet</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map((p) => (
            <div
              key={p.id}
              className="team-row"
              style={{ cursor: "pointer", borderRadius: 9, padding: "12px 10px" }}
              onClick={() => onOpenProject(p.id)}
            >
              <div className="team-meta">
                <div className="nm">{p.nom}</div>
                <div className="role">{fmtEUR(p.budget)} · {p.duree} sem. · {p.cycle}</div>
              </div>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600 }}>{p.cpi.toFixed(2)}</div>
                  <div style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>CPI</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600 }}>{p.spi.toFixed(2)}</div>
                  <div style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>SPI</div>
                </div>
                {p.highRisks > 0 && (
                  <span className="crit-tag" style={{ background: "rgba(255,92,114,.15)", color: "var(--red)" }}>
                    {p.highRisks} risque(s) critique(s)
                  </span>
                )}
                <span className={"gauge-status " + HEALTH_CLASS[p.health]} style={{ marginTop: 0 }}>{HEALTH_LABEL[p.health]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
