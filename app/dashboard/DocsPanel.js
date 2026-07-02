"use client";
import { useState } from "react";

const fmtEUR = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const CYCLE_LABEL = {
  predictif: "Prédictif (Gantt / chemin critique)",
  agile: "Agile (Kanban / sprints)",
  hybride: "Hybride (jalons macro + exécution agile)",
};

export default function DocsPanel({ project, user }) {
  const [loadingCharte, setLoadingCharte] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [err, setErr] = useState("");

  async function fetchTasksSummary() {
    const res = await fetch(`/api/projects/${project.id}/tasks`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger la WBS.");
    return data;
  }

  async function exportCharte() {
    setErr("");
    setLoadingCharte(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const marginX = 15;
      let y = 20;

      doc.setFontSize(18);
      doc.text("Charte de projet — NEXUS", marginX, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, marginX, y);
      y += 10;
      doc.setTextColor(0);

      function field(label, value) {
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(label, marginX, y);
        doc.setFont(undefined, "normal");
        const lines = doc.splitTextToSize(String(value), 120);
        doc.text(lines, marginX + 58, y);
        y += Math.max(7, lines.length * 6);
      }

      field("Nom du projet :", project.nom);
      field("Porteur du projet :", user?.displayName || "—");
      field("Cycle de vie :", CYCLE_LABEL[project.cycle] || project.cycle);
      field("Budget alloué :", fmtEUR(project.budget));
      field("Durée prévue :", `${project.duree} jour(s)`);
      if (project.risk_sector) field("Secteur / contexte :", project.risk_sector);
      field("Taille de l'équipe :", `${(project.team || []).length} membre(s)`);
      y += 6;

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Justification et autorité du projet", marginX, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const justif = doc.splitTextToSize(
        `Ce document formalise l'autorisation du projet "${project.nom}" et confère au porteur de projet ` +
          `l'autorité pour mobiliser les ressources nécessaires à sa réalisation, dans les limites du budget ` +
          `(${fmtEUR(project.budget)}) et du délai (${project.duree} jour(s)) définis ci-dessus.`,
        180
      );
      doc.text(justif, marginX, y);

      doc.save(`charte-projet-${project.nom.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
    } catch (e) {
      setErr(e.message || "Erreur lors de la génération.");
    } finally {
      setLoadingCharte(false);
    }
  }

  async function exportPlan() {
    setErr("");
    setLoadingPlan(true);
    try {
      const tasksData = await fetchTasksSummary();
      const tasks = tasksData.tasks || [];
      const criticalCount = tasks.filter((t) => t.critical).length;
      const risks = project.risks || [];
      const team = project.team || [];

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const marginX = 15;
      let y = 20;

      doc.setFontSize(18);
      doc.text("Plan de management de projet — NEXUS", marginX, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Projet : ${project.nom} — Généré le ${new Date().toLocaleDateString("fr-FR")}`, marginX, y);
      y += 12;
      doc.setTextColor(0);

      function section(title, lines) {
        if (y > 258) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(title, marginX, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        lines.forEach((l) => {
          const wrapped = doc.splitTextToSize("• " + l, 180);
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(wrapped, marginX, y);
          y += wrapped.length * 5.5 + 2;
        });
        y += 5;
      }

      section("1. Gestion du périmètre", [
        `WBS composée de ${tasks.length} tâche(s), organisée avec des dépendances Fin-à-Début.`,
        `Chemin critique calculé par la méthode CPM : ${criticalCount} tâche(s) critique(s), durée totale ` +
          `du projet estimée à ${tasksData.makespan} jour(s).`,
        `Toute modification de périmètre passe obligatoirement par le processus de Contrôle des changements.`,
      ]);

      section("2. Gestion des coûts", [
        `Budget alloué : ${fmtEUR(project.budget)}.`,
        `Suivi par la méthode de la Valeur Acquise (EVM) : PV, EV et AC recalculés chaque semaine.`,
        `Indicateurs suivis : CPI, SPI, VAC et TCPI, consultables dans le Tableau de bord.`,
      ]);

      section("3. Gestion des délais", [
        `Durée prévisionnelle : ${project.duree} jour(s) — cycle de vie : ${CYCLE_LABEL[project.cycle] || project.cycle}.`,
        `Le chemin critique (méthode CPM) détermine les tâches qui ne tolèrent aucun retard sans impacter la date de fin.`,
      ]);

      section("4. Gestion des risques", [
        risks.length
          ? `${risks.length} risque(s) identifié(s) et hiérarchisé(s) par score Probabilité × Impact via le Risk Predictor IA.`
          : `Aucun risque formellement enregistré à ce jour — il est recommandé de lancer le Risk Predictor avant le démarrage.`,
        `Chaque risque dispose d'une stratégie de mitigation documentée, exportable via le Registre des risques.`,
      ]);

      section("5. Gestion des ressources humaines", [
        `Équipe actuelle : ${team.length} membre(s)${
          team.length ? " — " + team.map((m) => `${m.nom} (${m.role})`).join(", ") : ""
        }.`,
        `Les membres marqués "critiques" sont ceux dont l'indisponibilité impacte directement le chemin critique.`,
      ]);

      section("6. Gestion des communications", [
        `Rythme de reporting : hebdomadaire, matérialisé par les instantanés EVM (courbe en S).`,
        `Le Bouton Élan fournit une synthèse narrative de l'état d'avancement à partager avec les parties prenantes.`,
      ]);

      section("7. Contrôle intégré des changements", [
        `Toute demande de changement suit le circuit : soumission → décision (approbation/rejet) → recalcul ` +
          `automatique de l'impact budget/délai.`,
      ]);

      doc.save(`plan-management-${project.nom.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
    } catch (e) {
      setErr(e.message || "Erreur lors de la génération.");
    } finally {
      setLoadingPlan(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">Documents PMI</h1>
      <p className="page-sub">
        Générez les livrables PMI standards à partir des données réelles du projet — utile pour vos audits et
        revues de gouvernance.
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>📄 Charte de projet</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
          Document d'autorisation formelle du projet : porteur, budget, délai et cycle de vie.
        </p>
        <button className="btn small" disabled={loadingCharte} onClick={exportCharte}>
          {loadingCharte ? "Génération..." : "Générer le PDF"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>📘 Plan de management de projet</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
          Synthèse des 7 domaines de gestion PMBOK (périmètre, coûts, délais, risques, RH, communication,
          changements), construite à partir des données actuelles du projet.
        </p>
        <button className="btn small" disabled={loadingPlan} onClick={exportPlan}>
          {loadingPlan ? "Génération..." : "Générer le PDF"}
        </button>
      </div>

      {err && <div className="err">{err}</div>}
    </section>
  );
}
