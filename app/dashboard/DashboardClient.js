"use client";
import { useState, useEffect, useCallback } from "react";
import AppShell from "../components/AppShell";

const CYCLE_TEXT = {
  predictif: "Mode prédictif — périmètre figé, toute modification déclenche une demande formelle de contrôle des changements.",
  agile: "Mode agile — WBS transformée en Product Backlog, vélocité et Burndown recalculés à chaque sprint.",
  hybride: "Mode hybride — jalons macro-gérés en Prédictif, exécution terrain en Agile.",
};

const fmtEUR = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
function statusClass(v) {
  if (v < 0.9) return ["status-red", "ALERTE"];
  if (v < 1.0) return ["status-amber", "VIGILANCE"];
  return ["status-green", "SAIN"];
}
function needleAngle(v) {
  const c = Math.max(0.5, Math.min(1.5, v));
  return ((c - 0.5) / 1.0) * 180 - 90;
}
function riskColor(score) {
  if (score >= 15) return "var(--red)";
  if (score >= 8) return "var(--amber)";
  return "var(--green)";
}
function teamAC(team) {
  return (team || []).reduce((s, m) => s + Number(m.taux_horaire) * Number(m.heures_cumulees || 0), 0);
}

export default function DashboardClient({ user }) {
  const [tab, setTab] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
    setLoadingProjects(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadProject = useCallback(async (id) => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    if (res.ok) setProject(data.project);
  }, []);

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, [projectId, loadProject]);

  function selectProject(id) {
    setProjectId(id);
    setTab("dash");
  }

  return (
    <AppShell user={user} activeTab={tab} onTabChange={setTab} hasProject={!!projectId}>
      {tab !== "projects" && project && (
        <div className="topstrip">
          <div className="project-select">
            <select
              value={projectId || ""}
              onChange={(e) => {
                setProjectId(Number(e.target.value));
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
          <div className="cycle-pills">
            {["predictif", "hybride", "agile"].map((c) => (
              <button
                key={c}
                className={"pill" + (project.cycle === c ? " active" : "")}
                onClick={async () => {
                  await fetch(`/api/projects/${projectId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cycle: c }),
                  });
                  setProject((p) => ({ ...p, cycle: c }));
                }}
              >
                {c === "predictif" ? "🌊 Prédictif" : c === "agile" ? "🔁 Agile" : "♾️ Hybride"}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "projects" && (
        <ProjectsPanel
          user={user}
          projects={projects}
          loading={loadingProjects}
          onSelect={selectProject}
          onRefresh={loadProjects}
          showNewModal={showNewModal}
          setShowNewModal={setShowNewModal}
        />
      )}

      {tab === "dash" && project && <DashPanel project={project} />}
      {tab === "risk" && project && <RiskPanel project={project} setProject={setProject} />}
      {tab === "elan" && project && <ElanPanel project={project} setProject={setProject} />}
      {tab === "team" && project && (
        <TeamPanel project={project} setProject={setProject} onTimesheetChange={() => loadProject(projectId)} />
      )}
    </AppShell>
  );
}

/* ================= PROJECTS ================= */
function ProjectsPanel({ user, projects, loading, onSelect, onRefresh, showNewModal, setShowNewModal }) {
  const [nom, setNom] = useState("");
  const [budget, setBudget] = useState(50000);
  const [duree, setDuree] = useState(12);
  const [cycle, setCycle] = useState("hybride");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    if (user.type === "entreprise") {
      fetch("/api/invites").then((r) => r.json()).then((d) => setInvites(d.invites || []));
    }
  }, [user.type]);

  async function createProject() {
    if (!nom.trim()) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, budget: Number(budget), duree: Number(duree), cycle }),
    });
    setNom("");
    setShowNewModal(false);
    onRefresh();
  }

  async function deleteProject(id) {
    if (!confirm("Supprimer ce projet ?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function sendInvite() {
    if (!inviteEmail.includes("@")) return;
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites((i) => [data.invite, ...i]);
      setInviteEmail("");
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    }
  }

  return (
    <section>
      <h1 className="page-title">Mes projets</h1>
      <p className="page-sub">Vos projets sont sauvegardés en base de données et restent disponibles à votre prochaine connexion.</p>

      {user.type === "entreprise" && (
        <div className="invite-box">
          <h3 style={{ margin: "0 0 8px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".3px" }}>
            Inviter un collaborateur
          </h3>
          <div className="invite-row">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@collaborateur.com" />
            <button className="btn small" onClick={sendInvite}>+ Inviter</button>
          </div>
          {inviteSent && <div className="invite-sent">Invitation enregistrée (aucun email réel n'est expédié — à brancher sur un service comme Resend).</div>}
          <div className="invite-list">
            {invites.map((inv) => (
              <span key={inv.id} className="invite-chip">{inv.email}</span>
            ))}
          </div>
        </div>
      )}

      <div className="projects-head">
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
          {loading ? "Chargement..." : `${projects.length} ${projects.length > 1 ? "projets" : "projet"}`}
        </span>
      </div>

      <div className="proj-grid">
        {projects.map((p) => (
          <div key={p.id} className="proj-card" onClick={() => onSelect(p.id)}>
            <button className="del" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>✕</button>
            <div className="nm">{p.nom}</div>
            <div className="meta">{Number(p.budget).toLocaleString("fr-FR")} € · {p.duree} sem.</div>
            <span className="badge">{p.cycle}</span>
          </div>
        ))}
        <button className="new-proj-card" onClick={() => setShowNewModal(true)}>+ Nouveau projet</button>
      </div>

      <div className={"modal-overlay" + (showNewModal ? " active" : "")}>
        <div className="modal">
          <h3>Nouveau projet</h3>
          <div className="auth-field">
            <label>Nom du projet</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Refonte ERP" />
          </div>
          <div className="auth-row2">
            <div className="auth-field">
              <label>Budget total (€)</label>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="auth-field">
              <label>Durée (semaines)</label>
              <input type="number" value={duree} onChange={(e) => setDuree(e.target.value)} />
            </div>
          </div>
          <div className="auth-field">
            <label>Cycle de vie</label>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
              <option value="predictif">Prédictif</option>
              <option value="hybride">Hybride</option>
              <option value="agile">Agile</option>
            </select>
          </div>
          <div className="actions">
            <button className="btn secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowNewModal(false)}>Annuler</button>
            <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={createProject}>Créer</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= DASHBOARD (EVM) ================= */
function DashPanel({ project }) {
  const [pv, setPv] = useState(project.pv);
  const [ev, setEv] = useState(project.ev);

  useEffect(() => {
    setPv(project.pv);
    setEv(project.ev);
  }, [project.id]);

  async function persist(newPv, newEv) {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pv: newPv, ev: newEv }),
    });
  }

  const budget = Number(project.budget);
  const duree = Number(project.duree);
  const AC = Math.max(1, teamAC(project.team));
  const PV = (budget * pv) / 100;
  const EV = (budget * ev) / 100;
  const CPI = EV / AC;
  const SPI = EV / PV;
  const CV = EV - AC;
  const SV = EV - PV;
  const EAC = CPI > 0 ? budget / CPI : budget;
  const forecastDuree = SPI > 0 ? duree / SPI : duree;
  const delay = forecastDuree - duree;
  const [cpiClass, cpiLabel] = statusClass(CPI);
  const [spiClass, spiLabel] = statusClass(SPI);
  const acPct = Math.min(100, Math.round((AC / budget) * 100));

  let alertMsg;
  if (CPI >= 1 && SPI >= 1) {
    alertMsg = `Tout est sous contrôle. Au rythme actuel, le projet sera livré dans les temps et respectera son budget de ${fmtEUR(budget)}.`;
  } else {
    const overPct = Math.max(0, Math.round(((EAC - budget) / budget) * 100));
    const delayTxt = delay > 0 ? `${Math.abs(delay).toFixed(1)} semaine(s) de retard` : "aucun retard";
    alertMsg = `Attention, au rythme actuel, le projet dépassera son budget de ${overPct}% et aura ${delayTxt}.`;
  }

  return (
    <section>
      <h1 className="page-title">{project.nom}</h1>
      <p className="page-sub">{CYCLE_TEXT[project.cycle]}</p>

      <div className="ai-banner">
        <div className="dot"></div>
        <p>{alertMsg}<span className="src">Alerte générée par le moteur EVM</span></p>
      </div>

      <div className="grid3">
        <div className="card">
          <h3>IPC — Indice de coût (CPI)</h3>
          <div className="gauge-wrap">
            <div className="gauge">
              <div className="band"></div><div className="mask"></div>
              <div className="needle" style={{ transform: `rotate(${needleAngle(CPI)}deg)` }}></div>
              <div className="hub"></div>
            </div>
            <div className="gauge-val">{CPI.toFixed(2)}</div>
            <div className={"gauge-status " + cpiClass}>{cpiLabel}</div>
          </div>
        </div>
        <div className="card">
          <h3>IPD — Indice de délai (SPI)</h3>
          <div className="gauge-wrap">
            <div className="gauge">
              <div className="band"></div><div className="mask"></div>
              <div className="needle" style={{ transform: `rotate(${needleAngle(SPI)}deg)` }}></div>
              <div className="hub"></div>
            </div>
            <div className="gauge-val">{SPI.toFixed(2)}</div>
            <div className={"gauge-status " + spiClass}>{spiLabel}</div>
          </div>
        </div>
        <div className="card">
          <h3>Projection IA</h3>
          <div className="stat-row" style={{ flexDirection: "column" }}>
            <div className="stat"><div className="v">{fmtEUR(EAC)}</div><div className="l">Coût final estimé (EAC)</div></div>
            <div className="stat" style={{ marginTop: 10 }}><div className="v">{(delay >= 0 ? "+" : "") + delay.toFixed(1)} sem.</div><div className="l">Retard projeté</div></div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Avancement (saisie manuelle)</h3>
          <div className="field">
            <label>Avancement prévu à date<b>{pv}%</b></label>
            <input type="range" min={1} max={100} value={pv} onChange={(e) => setPv(Number(e.target.value))} onMouseUp={() => persist(pv, ev)} onTouchEnd={() => persist(pv, ev)} />
          </div>
          <div className="field">
            <label>Avancement réel constaté<b>{ev}%</b></label>
            <input type="range" min={1} max={100} value={ev} onChange={(e) => setEv(Number(e.target.value))} onMouseUp={() => persist(pv, ev)} onTouchEnd={() => persist(pv, ev)} />
          </div>
          <div className="axis-caption">Budget : {fmtEUR(budget)} · Durée : {duree} sem.</div>
          <div className="axis-caption" style={{ marginTop: 8 }}>Le coût réel (AC) est calculé automatiquement depuis la feuille de temps de l'équipe →</div>
        </div>
        <div className="card">
          <h3>Avancement</h3>
          <div className="bar-row"><div className="lbl"><span>Prévu (PV)</span><span>{pv}%</span></div><div className="bar-track"><div className="bar-fill" style={{ background: "var(--blue)", width: pv + "%" }}></div></div></div>
          <div className="bar-row"><div className="lbl"><span>Réel (EV)</span><span>{ev}%</span></div><div className="bar-track"><div className="bar-fill" style={{ background: "var(--gold)", width: ev + "%" }}></div></div></div>
          <div className="bar-row"><div className="lbl"><span>Budget consommé (AC, timesheet)</span><span>{acPct}%</span></div><div className="bar-track"><div className="bar-fill" style={{ background: "var(--red)", width: acPct + "%" }}></div></div></div>
          <div className="stat-row">
            <div className="stat"><div className="v">{(CV >= 0 ? "+" : "") + fmtEUR(CV)}</div><div className="l">Écart de coût (CV)</div></div>
            <div className="stat"><div className="v">{(SV >= 0 ? "+" : "") + fmtEUR(SV)}</div><div className="l">Écart de délai (SV)</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= RISK PREDICTOR ================= */
function RiskPanel({ project, setProject }) {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const risks = project.risks || [];

  async function generate() {
    if (!desc.trim()) return;
    setLoading(true);
    setErr("");
    const res = await fetch(`/api/projects/${project.id}/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(data.error || "La génération a échoué. Réessayez.");
      return;
    }
    setProject((p) => ({ ...p, risk_sector: data.project.risk_sector, risks: data.project.risks }));
  }

  return (
    <section>
      <h1 className="page-title">Risk Predictor</h1>
      <p className="page-sub">Décrivez l'objectif du projet — l'IA génère la matrice des risques PMP et sauvegarde le résultat.</p>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Objectif du projet</h3>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex : Créer un site e-commerce B2B avec paiement intégré..." />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" disabled={loading} onClick={generate}>🧠 Générer la matrice des risques</button>
          {loading && <span className="loading"><span className="spin"></span> Analyse du secteur et des risques historiques...</span>}
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Matrice Probabilité × Impact {project.risk_sector && <span style={{ color: "var(--gold-soft)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>— {project.risk_sector}</span>}</h3>
          <div className="matrix-wrap">
            <div className="matrix-yaxis"><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div>
            <div className="matrix" style={{ position: "relative" }}>
              {Array.from({ length: 25 }).map((_, i) => {
                const row = 5 - Math.floor(i / 5);
                const col = (i % 5) + 1;
                const score = row * col;
                const alpha = 0.1 + (score / 25) * 0.28;
                const bg = score >= 15 ? `rgba(255,92,114,${alpha})` : score >= 8 ? `rgba(246,183,60,${alpha})` : `rgba(63,217,155,${alpha})`;
                return <div key={i} className="mcell" style={{ background: bg }}></div>;
              })}
              {risks.map((r, i) => (
                <div
                  key={i}
                  className="risk-dot"
                  title={r.nom}
                  style={{
                    left: `${((r.impact - 0.5) / 5) * 100}%`,
                    top: `${((5 - r.probabilite + 0.5) / 5) * 100}%`,
                    background: riskColor(r.probabilite * r.impact),
                  }}
                ></div>
              ))}
            </div>
          </div>
          <div className="matrix-xaxis"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
          <div className="axis-caption">Axe horizontal : Impact — Axe vertical : Probabilité</div>
        </div>
        <div className="card">
          <h3>Risques identifiés &amp; atténuation</h3>
          {risks.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune analyse encore générée pour ce projet.</p>
          ) : (
            <div className="risk-list">
              {[...risks].sort((a, b) => b.probabilite * b.impact - a.probabilite * a.impact).map((r, i) => {
                const score = r.probabilite * r.impact;
                const color = riskColor(score);
                return (
                  <div key={i} className="risk-item" style={{ borderLeftColor: color }}>
                    <div className="top">
                      <span className="name">{r.nom}</span>
                      <span className="score" style={{ background: color + "22", color }}>P{r.probabilite} × I{r.impact} = {score}</span>
                    </div>
                    <div className="mit">{r.mitigation}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================= BOUTON ÉLAN ================= */
function ElanPanel({ project, setProject }) {
  const [desc, setDesc] = useState("");
  const [animating, setAnimating] = useState(false);
  const [litCount, setLitCount] = useState(0);
  const [err, setErr] = useState("");
  const elan = project.elan;

  async function activate() {
    if (!desc.trim()) return;
    setErr("");
    setAnimating(true);
    setLitCount(0);

    const aiPromise = fetch(`/api/projects/${project.id}/elan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc }),
    }).then((r) => r.json().then((data) => ({ ok: r.ok, data })));

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setLitCount(i);
      if (i >= 7) clearInterval(interval);
    }, 180);

    const { ok, data } = await aiPromise;
    await new Promise((r) => setTimeout(r, 7 * 180 + 100));
    setAnimating(false);

    if (!ok) {
      setErr(data.error || "Le recalcul a échoué. Réessayez.");
      return;
    }
    setProject((p) => ({ ...p, elan: data.project.elan }));
  }

  return (
    <section>
      <h1 className="page-title">Bouton Élan</h1>
      <p className="page-sub">En cas de crise majeure, décrivez la situation. L'IA recalcule le chemin critique et propose 3 scénarios — sauvegardés dans le projet.</p>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Décrire la crise</h3>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex : Notre ingénieur backend démissionne dans 3 jours..." />
      </div>

      <div className="elan-stage">
        <button className="elan-btn" disabled={animating} onClick={activate}>
          <span className="t">ÉLAN</span>
          <span className="s">Activer</span>
        </button>

        <div className={"recalc" + (animating ? " active" : "")}>
          <div className="recalc-label">{elan && !animating ? elan.cheminCritique : "Recalcul du chemin critique en cours"}</div>
          <div className="path-track">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={"n" + i} style={{ display: "contents" }}>
                <div className={"node" + (i < litCount ? " lit" : "")}></div>
                {i < 6 && <div className="edge"></div>}
              </span>
            ))}
          </div>
        </div>

        {err && <div className="err">{err}</div>}
      </div>

      {elan && !animating && (
        <div className="scenarios active">
          {elan.scenarios.map((s, i) => (
            <div key={i} className="scenario">
              <h4>{s.titre}</h4>
              <p>{s.resume}</p>
              <div className="meta"><b>Réallocation</b>{s.reallocation}</div>
              <div className="meta"><b>Compromis</b>{s.compromis}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ================= TEAM / TIMESHEET ================= */
function TeamPanel({ project, setProject, onTimesheetChange }) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState("");
  const [taux, setTaux] = useState(45);
  const [crit, setCrit] = useState(false);
  const team = project.team || [];

  async function addMember() {
    if (!nom.trim()) return;
    const res = await fetch(`/api/projects/${project.id}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, role: role || "Collaborateur", tauxHoraire: Number(taux), critical: crit }),
    });
    const data = await res.json();
    if (res.ok) {
      setProject((p) => ({ ...p, team: [...(p.team || []), data.member] }));
      setNom(""); setRole(""); setCrit(false);
    }
  }

  async function setHeuresSemaine(memberId, value) {
    setProject((p) => ({
      ...p,
      team: p.team.map((m) => (m.id === memberId ? { ...m, heures_semaine: value } : m)),
    }));
    await fetch(`/api/projects/${project.id}/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setHeuresSemaine", value }),
    });
  }

  async function logSemaine(memberId) {
    const res = await fetch(`/api/projects/${project.id}/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logSemaine" }),
    });
    const data = await res.json();
    if (res.ok) {
      setProject((p) => ({
        ...p,
        team: p.team.map((m) => (m.id === memberId ? data.member : m)),
      }));
    }
  }

  async function deleteMember(memberId) {
    await fetch(`/api/projects/${project.id}/team/${memberId}`, { method: "DELETE" });
    setProject((p) => ({ ...p, team: p.team.filter((m) => m.id !== memberId) }));
  }

  const avatarColors = ["#F3B62B", "#5B7CFF", "#3FD99B", "#FF8A93", "#FFD874"];

  return (
    <section>
      <h1 className="page-title">Équipe &amp; feuille de temps</h1>
      <p className="page-sub">Chaque heure enregistrée alimente automatiquement le coût réel (AC) du tableau de bord.</p>

      <div className="card">
        <h3>Collaborateurs</h3>
        <div>
          {team.map((m, i) => {
            const load = Math.min(100, Math.round((Number(m.heures_semaine) || 0) / 35 * 100));
            const color = load >= 90 ? "var(--red)" : load >= 70 ? "var(--amber)" : "var(--green)";
            return (
              <div key={m.id}>
                <div className="team-row">
                  <div className="avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                    {m.nom.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <div className="team-meta">
                    <div className="nm">{m.nom}{m.critical && <span className="crit-tag">Chemin critique</span>}</div>
                    <div className="role">{m.role} · {m.taux_horaire} €/h</div>
                  </div>
                  <div className="ts-input">
                    <input
                      type="number" min={0} max={80}
                      value={m.heures_semaine || 0}
                      onChange={(e) => setHeuresSemaine(m.id, Number(e.target.value))}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>h cette semaine</span>
                    <button className="btn small secondary" onClick={() => logSemaine(m.id)}>Enregistrer</button>
                  </div>
                  <span className="ts-cum">Total : {m.heures_cumulees || 0}h · {fmtEUR(m.taux_horaire * (m.heures_cumulees || 0))}</span>
                  <button className="btn small ghost" onClick={() => deleteMember(m.id)}>✕</button>
                </div>
                {m.critical && load >= 90 && (
                  <div style={{ fontSize: 11.5, color: "var(--red)", margin: "-6px 0 10px 50px" }}>
                    ⚠ Surcharge détectée sur le chemin critique — redistribution recommandée.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="add-member-form">
          <div className="f"><label>Nom</label><input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" /></div>
          <div className="f"><label>Rôle</label><input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Dev Backend" /></div>
          <div className="f"><label>Taux (€/h)</label><input type="number" value={taux} onChange={(e) => setTaux(e.target.value)} /></div>
          <label className="chk"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} /> Chemin critique</label>
          <button className="btn small" onClick={addMember}>+ Ajouter</button>
        </div>
      </div>
    </section>
  );
}
