"use client";
import { useState, useEffect, useCallback } from "react";

export default function SCurveChart({ projectId }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/evm-history`);
    const data = await res.json();
    if (res.ok) setSnapshots(data.snapshots);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: "var(--muted)", fontSize: 13 }}>Chargement...</p>;

  if (snapshots.length < 2) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Pas encore assez de données historiques pour tracer la courbe en S. Chaque semaine où vous
        ajustez l'avancement ou enregistrez des heures d'équipe ajoute un point — revenez dans
        quelques semaines, ou continuez à mettre à jour le projet régulièrement.
      </p>
    );
  }

  const W = 640, H = 220, padL = 50, padB = 26, padT = 10, padR = 10;
  const maxVal = Math.max(...snapshots.flatMap((s) => [Number(s.pv), Number(s.ev), Number(s.ac)]), 1);
  const plotW = W - padL - padR, plotH = H - padT - padB;

  function xFor(i) { return padL + (snapshots.length === 1 ? 0 : (i / (snapshots.length - 1)) * plotW); }
  function yFor(v) { return padT + plotH - (v / maxVal) * plotH; }

  function pathFor(key) {
    return snapshots.map((s, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(Number(s[key])).toFixed(1)}`).join(" ");
  }

  const fmtShort = (n) => (n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} y1={padT + plotH * (1 - f)} x2={W - padR} y2={padT + plotH * (1 - f)} stroke="#2B3766" strokeWidth="1" />
            <text x={padL - 8} y={padT + plotH * (1 - f) + 4} fontSize="9" fill="#919BC4" textAnchor="end">{fmtShort(maxVal * f)}</text>
          </g>
        ))}
        {/* axes des semaines */}
        {snapshots.map((s, i) => (
          (i === 0 || i === snapshots.length - 1 || i % Math.ceil(snapshots.length / 6) === 0) && (
            <text key={s.week_key} x={xFor(i)} y={H - 8} fontSize="9" fill="#919BC4" textAnchor="middle">{s.week_key.replace(/^\d{4}-/, "")}</text>
          )
        ))}
        <path d={pathFor("pv")} fill="none" stroke="#5B7CFF" strokeWidth="2.5" />
        <path d={pathFor("ev")} fill="none" stroke="#F3B62B" strokeWidth="2.5" />
        <path d={pathFor("ac")} fill="none" stroke="#FF5C72" strokeWidth="2.5" />
        {snapshots.map((s, i) => (
          <g key={"pts" + i}>
            <circle cx={xFor(i)} cy={yFor(Number(s.pv))} r="2.5" fill="#5B7CFF" />
            <circle cx={xFor(i)} cy={yFor(Number(s.ev))} r="2.5" fill="#F3B62B" />
            <circle cx={xFor(i)} cy={yFor(Number(s.ac))} r="2.5" fill="#FF5C72" />
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#5B7CFF", borderRadius: 2, marginRight: 5 }}></span>PV (prévu)</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#F3B62B", borderRadius: 2, marginRight: 5 }}></span>EV (réel)</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#FF5C72", borderRadius: 2, marginRight: 5 }}></span>AC (coût réel)</span>
      </div>
    </div>
  );
}
