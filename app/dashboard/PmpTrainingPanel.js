"use client";
import { useState } from "react";

const DOMAINS = [
  "Tous domaines (mixte)", "Intégration", "Périmètre", "Délais", "Coûts",
  "Qualité", "Ressources", "Communication", "Risques", "Achats", "Parties prenantes", "Agile / Hybride",
];

export default function PmpTrainingPanel() {
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true); setErr(""); setSubmitted(false); setAnswers({});
    const res = await fetch("/api/pmp-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: domain === DOMAINS[0] ? null : domain }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || "La génération a échoué. Réessayez."); return; }
    setQuestions(data.questions);
  }

  function selectAnswer(qIdx, optIdx) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qIdx]: optIdx }));
  }

  const score = questions
    ? questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0)
    : 0;
  const allAnswered = questions && questions.every((_, i) => answers[i] !== undefined);

  return (
    <section>
      <h1 className="page-title">Entraînement PMP</h1>
      <p className="page-sub">
        Questions générées par IA au format de l'examen de certification PMP — puisque NEXUS est déjà
        aligné sur la méthodologie PMI, autant s'en servir pour s'entraîner.
      </p>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Générer un quiz</h3>
        <div className="auth-field">
          <label>Domaine à réviser</label>
          <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" disabled={loading} onClick={generate}>🧠 Générer 5 questions</button>
          {loading && <span className="loading"><span className="spin"></span> Préparation du quiz...</span>}
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      {questions && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {submitted && (
            <div className="ai-banner">
              <div className="dot"></div>
              <p>
                Score : {score} / {questions.length} — {score === questions.length ? "Excellent, sans faute !" : score >= questions.length * 0.7 ? "Bon score, quelques révisions à consolider." : "Continuez à vous entraîner, ça viendra."}
                <span className="src">Résultat de la session d'entraînement</span>
              </p>
            </div>
          )}

          {questions.map((q, qi) => (
            <div key={qi} className="card">
              <h3 style={{ textTransform: "none", letterSpacing: 0, fontSize: 14, color: "var(--cream)" }}>
                {qi + 1}. {q.question}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {q.options.map((opt, oi) => {
                  const isSelected = answers[qi] === oi;
                  const isCorrect = oi === q.correctIndex;
                  let borderColor = "var(--line)";
                  let bg = "var(--bg-raised)";
                  if (submitted) {
                    if (isCorrect) { borderColor = "var(--green)"; bg = "rgba(63,217,155,.1)"; }
                    else if (isSelected && !isCorrect) { borderColor = "var(--red)"; bg = "rgba(255,92,114,.1)"; }
                  } else if (isSelected) {
                    borderColor = "var(--blue)";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => selectAnswer(qi, oi)}
                      style={{
                        all: "unset", cursor: submitted ? "default" : "pointer",
                        padding: "10px 14px", borderRadius: 8, border: `1px solid ${borderColor}`,
                        background: bg, fontSize: 13, color: "var(--cream)",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div className="axis-caption" style={{ marginTop: 10, textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--muted)" }}>
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted && (
            <button className="btn" disabled={!allAnswered} onClick={() => setSubmitted(true)} style={{ alignSelf: "flex-start" }}>
              Valider mes réponses
            </button>
          )}
        </div>
      )}
    </section>
  );
}
