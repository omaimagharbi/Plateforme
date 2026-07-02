"use client";
import { useRouter } from "next/navigation";
import Logo from "./Logo";

const NAV_ITEMS = [
  { key: "projects", label: "Mes projets", needsProject: false },
  { key: "portfolio", label: "Portfolio PMO", needsProject: false, entrepriseOnly: true },
  { key: "dash", label: "Tableau de bord", needsProject: true },
  { key: "tasks", label: "Tâches (WBS)", needsProject: true },
  { key: "changes", label: "Contrôle des changements", needsProject: true },
  { key: "risk", label: "Risques IA", needsProject: true },
  { key: "docs", label: "Documents PMI", needsProject: true },
  { key: "elan", label: "Bouton Élan", needsProject: true },
  { key: "team", label: "Équipe & temps", needsProject: true },
  { key: "pmp", label: "Entraînement PMP", needsProject: false },
];

export default function AppShell({ user, activeTab, onTabChange, hasProject, children }) {
  const router = useRouter();
  const visibleItems = NAV_ITEMS.filter((item) => !item.entrepriseOnly || user.type === "entreprise");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <div className="name">NEXUS</div>
            <span className="tag">Copilote PMP</span>
          </div>
        </div>

        <nav className="nav">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              className={activeTab === item.key ? "active" : ""}
              onClick={() => {
                if (item.needsProject && !hasProject) {
                  alert('Sélectionnez ou créez d\'abord un projet dans "Mes projets".');
                  return;
                }
                onTabChange(item.key);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="su-name">{user.displayName}</div>
          <div className="su-type">{user.type === "entreprise" ? "Compte Entreprise" : "Compte Particulier"}</div>
          <button className="logout-btn" onClick={handleLogout}>↪ Se déconnecter</button>
        </div>
      </aside>

      <main className="main-area">{children}</main>
    </div>
  );
}
