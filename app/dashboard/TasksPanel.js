"use client";
import { useState, useEffect, useCallback } from "react";

const STATUS_LABEL = { todo: "À faire", in_progress: "En cours", done: "Terminé" };
const STATUS_ORDER = ["todo", "in_progress", "done"];

export default function TasksPanel({ project }) {
  const [tasks, setTasks] = useState([]);
  const [makespan, setMakespan] = useState(0);
  const [view, setView] = useState("kanban"); // 'kanban' | 'gantt'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form nouvelle tâche
  const [nom, setNom] = useState("");
  const [duree, setDuree] = useState(3);
  const [deps, setDeps] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${project.id}/tasks`);
    const data = await res.json();
    if (res.ok) { setTasks(data.tasks); setMakespan(data.makespan); }
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  async function createTask() {
    if (!nom.trim() || !duree) return;
    setErr("");
    const res = await fetch(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, duree: Number(duree), dependsOn: deps }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Erreur lors de la création."); return; }
    setNom(""); setDuree(3); setDeps([]);
    load();
  }

  async function updateStatus(taskId, status) {
    await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteTask(taskId) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await fetch(`/api/projects/${project.id}/tasks/${taskId}`, { method: "DELETE" });
    load();
  }

  function toggleDep(taskId) {
    setDeps((d) => (d.includes(taskId) ? d.filter((x) => x !== taskId) : [...d, taskId]));
  }

  const criticalCount = tasks.filter((t) => t.critical).length;

  return (
    <section>
      <h1 className="page-title">Tâches (WBS)</h1>
      <p className="page-sub">
        Structure de découpage du projet (WBS) avec dépendances. Le chemin critique est calculé
        mathématiquement (méthode CPM du PMBOK), pas estimé par l'IA.
      </p>

      <div className="grid3" style={{ marginBottom: 22 }}>
        <div className="stat"><div className="v">{tasks.length}</div><div className="l">Tâches totales</div></div>
        <div className="stat"><div className="v" style={{ color: "var(--red)" }}>{criticalCount}</div><div className="l">Sur le chemin critique</div></div>
        <div className="stat"><div className="v">{makespan} j.</div><div className="l">Durée totale calculée</div></div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Ajouter une tâche</h3>
        <div className="auth-row2" style={{ marginBottom: 10 }}>
          <div className="auth-field" style={{ marginBottom: 0 }}>
            <label>Nom de la tâche</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Spécifications techniques" />
          </div>
          <div className="auth-field" style={{ marginBottom: 0 }}>
            <label>Durée (jours)</label>
            <input type="number" min={1} value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
        </div>
        {tasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>
              Dépend de (la tâche ne peut démarrer qu'une fois celles-ci terminées)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={"pill" + (deps.includes(t.id) ? " active" : "")}
                  onClick={() => toggleDep(t.id)}
                >
                  {t.nom}
                </button>
              ))}
            </div>
          </div>
        )}
        {err && <div className="err">{err}</div>}
        <button className="btn small" onClick={createTask}>+ Ajouter la tâche</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button className={"pill" + (view === "kanban" ? " active" : "")} onClick={() => setView("kanban")}>📋 Vue Kanban</button>
        <button className={"pill" + (view === "gantt" ? " active" : "")} onClick={() => setView("gantt")}>📊 Vue Gantt</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Chargement...</p>
      ) : tasks.length === 0 ? (
        <div className="card"><p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Aucune tâche pour l'instant — ajoutez la première ci-dessus.</p></div>
      ) : view === "kanban" ? (
        <KanbanView tasks={tasks} onStatusChange={updateStatus} onDelete={deleteTask} />
      ) : (
        <GanttView tasks={tasks} makespan={makespan} onDelete={deleteTask} />
      )}
    </section>
  );
}

/* ================= KANBAN ================= */
function KanbanView({ tasks, onStatusChange, onDelete }) {
  return (
    <div className="grid3">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="card">
          <h3>{STATUS_LABEL[status]} ({tasks.filter((t) => t.status === status).length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.filter((t) => t.status === status).map((t) => (
              <div
                key={t.id}
                className="scenario"
                style={{ padding: 12, borderLeft: t.critical ? "3px solid var(--red)" : "3px solid var(--line)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.nom}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                      {t.duree} j. {t.critical && <span style={{ color: "var(--red)" }}>· chemin critique</span>}
                      {!t.critical && t.slack > 0 && <span> · marge {t.slack} j.</span>}
                    </div>
                  </div>
                  <button className="btn small ghost" style={{ padding: "4px 8px" }} onClick={() => onDelete(t.id)}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {STATUS_ORDER.filter((s) => s !== status).map((s) => (
                    <button key={s} className="btn small secondary" style={{ padding: "5px 9px", fontSize: 11 }} onClick={() => onStatusChange(t.id, s)}>
                      → {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= GANTT ================= */
function GanttView({ tasks, makespan, onDelete }) {
  const dayWidth = makespan > 0 ? Math.max(18, Math.min(48, 900 / makespan)) : 30;
  const sorted = [...tasks].sort((a, b) => a.es - b.es || a.wbs_order - b.wbs_order);

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <h3>Diagramme de Gantt {makespan > 0 && <span style={{ textTransform: "none", color: "var(--muted)", fontWeight: 500 }}>— {makespan} jours au total</span>}</h3>
      <div style={{ minWidth: makespan * dayWidth + 200 }}>
        {sorted.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 170, flexShrink: 0, fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t.nom}</span>
              <button className="btn small ghost" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => onDelete(t.id)}>✕</button>
            </div>
            <div style={{ position: "relative", height: 24, flex: 1 }}>
              {/* barre de marge (fantôme, jusqu'à la date au plus tard) */}
              {t.slack > 0 && (
                <div
                  style={{
                    position: "absolute", left: t.es * dayWidth, top: 0, height: 24,
                    width: (t.ef - t.es + t.slack) * dayWidth,
                    background: "var(--bg-raised)", borderRadius: 6, border: "1px dashed var(--line)",
                  }}
                ></div>
              )}
              {/* barre réelle de la tâche */}
              <div
                title={`ES ${t.es} → EF ${t.ef} · marge ${t.slack}j`}
                style={{
                  position: "absolute", left: t.es * dayWidth, top: 0, height: 24,
                  width: Math.max(4, (t.ef - t.es) * dayWidth),
                  background: t.critical ? "var(--red)" : "var(--gold)",
                  borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600, color: t.critical ? "#fff" : "#1a1408",
                }}
              >
                {t.duree}j
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="axis-caption" style={{ marginTop: 14 }}>
        <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--red)", borderRadius: 2, marginRight: 5 }}></span>
        Chemin critique (aucune marge possible)
        <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--gold)", borderRadius: 2, margin: "0 5px 0 16px" }}></span>
        Tâche avec marge
      </div>
    </div>
  );
}
