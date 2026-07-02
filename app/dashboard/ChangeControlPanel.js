"use client";
import { useState, useEffect, useCallback } from "react";

const fmtEUR = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const AMBER = "#F6B73C", GREEN = "#3FD99B", RED = "#FF5C72";

export default function ChangeControlPanel({ project, onProjectUpdate }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [impactBudget, setImpactBudget] = useState(0);
  const [impactDuree, setImpactDuree] = useState(0);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${project.id}/changes`);
    const data = await res.json();
    if (res.ok) setChanges(data.changes);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  async function submitChange() {
    if (!titre.trim()) return;
    setErr("");
    const res = await fetch(`/api/projects/${project.id}/changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, description, impactBudget: Number(impactBudget), impactDuree: Number(impactDuree) }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Erreur."); return; }
    setTitre(""); setDescription(""); setImpactBudget(0); setImpactDuree(0);
    load();
  }

  async function decide(changeId, decision) {
    const res = await fetch(`/api/projects/${project.id}/changes/${changeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    if (res.ok) {
      load();
      if (data.project) onProjectUpdate(data.project);
    }
  }

  const pending = changes.filter((c) => c.status === "pending");
  const decided = changes.filter((c) => c.status !== "pending");

  return (
    <section>
      <h1 className="page-title">Contrôle des changements</h1>
      <p className="page-sub">
        Toute modification de périmètre passe par une demande formelle. Une fois approuvée,
        l'impact est appliqué automatiquement au budget et à la durée du projet — traçabilité complète, conforme PMI.
      </p>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Nouvelle demande de changement</h3>
        <div className="auth-field">
          <label>Titre</label>
          <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Ajout d'un module de reporting" />
        </div>
        <div className="auth-field">
          <label>Description / justification</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pourquoi ce changement est-il demandé ?" />
        </div>
        <div className="auth-row2">
          <div className="auth-field" style={{ marginBottom: 0 }}>
            <label>Impact budget (€, peut être négatif)</label>
            <input type="number" value={impactBudget} onChange={(e) => setImpactBudget(e.target.value)} />
          </div>
          <div className="auth-field" style={{ marginBottom: 0 }}>
            <label>Impact durée (semaines, peut être négatif)</label>
            <input type="number" value={impactDuree} onChange={(e) => setImpactDuree(e.target.value)} />
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        <div style={{ marginTop: 14 }}>
          <button className="btn small" onClick={submitChange}>+ Soumettre la demande</button>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>En attente de décision ({pending.length})</h3>
          {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Chargement...</p> :
            pending.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune demande en attente.</p> :
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map((c) => (
                <div key={c.id} className="risk-item" style={{ borderLeftColor: AMBER }}>
                  <div className="top">
                    <span className="name">{c.titre}</span>
                    <span className="score" style={{ background: AMBER + "22", color: AMBER }}>EN ATTENTE</span>
                  </div>
                  {c.description && <div className="mit" style={{ marginBottom: 8 }}>{c.description}</div>}
                  <div style={{ fontSize: 12, color: "var(--cream)", marginBottom: 10 }}>
                    Impact : {c.impact_budget >= 0 ? "+" : ""}{fmtEUR(c.impact_budget)} · {c.impact_duree >= 0 ? "+" : ""}{c.impact_duree} sem.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn small" style={{ background: "var(--green)" }} onClick={() => decide(c.id, "approved")}>✓ Approuver</button>
                    <button className="btn small secondary" onClick={() => decide(c.id, "rejected")}>✕ Rejeter</button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
        <div className="card">
          <h3>Historique des décisions</h3>
          {decided.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune décision encore prise.</p> :
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {decided.map((c) => {
                const approved = c.status === "approved";
                const color = approved ? GREEN : RED;
                return (
                  <div key={c.id} className="risk-item" style={{ borderLeftColor: color }}>
                    <div className="top">
                      <span className="name">{c.titre}</span>
                      <span className="score" style={{ background: color + "22", color }}>{approved ? "APPROUVÉ" : "REJETÉ"}</span>
                    </div>
                    <div className="mit">
                      Impact : {c.impact_budget >= 0 ? "+" : ""}{fmtEUR(c.impact_budget)} · {c.impact_duree >= 0 ? "+" : ""}{c.impact_duree} sem.
                      {approved && " · appliqué au projet"}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
    </section>
  );
}
