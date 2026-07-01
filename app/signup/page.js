"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const [type, setType] = useState("particulier");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [responsable, setResponsable] = useState("");
  const [taille, setTaille] = useState("1-20 salariés");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!email.includes("@")) return setErr("Adresse email invalide.");
    if (password.length < 6) return setErr("Le mot de passe doit contenir au moins 6 caractères.");

    let payload = { email, password, type };
    if (type === "particulier") {
      if (!prenom || !nom) return setErr("Merci de renseigner prénom et nom.");
      payload.displayName = `${prenom} ${nom}`;
    } else {
      if (!entreprise || !responsable) return setErr("Merci de renseigner l'entreprise et le responsable.");
      payload.displayName = entreprise;
      payload.responsable = responsable;
      payload.taille = taille;
      payload.telephone = telephone;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur lors de l'inscription.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErr("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-brand">
          <Logo size={34} />
          <div className="name">NEXUS</div>
        </div>

        <div className="auth-tabs">
          <button onClick={() => router.push("/login")}>Connexion</button>
          <button className="active">Inscription</button>
        </div>

        <div className="choice-row">
          <button type="button" className={"choice-card" + (type === "particulier" ? " active" : "")} onClick={() => setType("particulier")}>
            <span className="em">👤</span>
            <span className="t">Particulier</span>
            <span className="s">Freelance, chef de projet</span>
          </button>
          <button type="button" className={"choice-card" + (type === "entreprise" ? " active" : "")} onClick={() => setType("entreprise")}>
            <span className="em">🏢</span>
            <span className="t">Entreprise</span>
            <span className="s">PMO, direction</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === "particulier" ? (
            <div className="auth-row2">
              <div className="auth-field">
                <label>Prénom</label>
                <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="auth-field">
                <label>Nom</label>
                <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div className="auth-field">
                <label>Nom de l'entreprise</label>
                <input type="text" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} />
              </div>
              <div className="auth-row2">
                <div className="auth-field">
                  <label>Nom du responsable</label>
                  <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
                </div>
                <div className="auth-field">
                  <label>Taille</label>
                  <select value={taille} onChange={(e) => setTaille(e.target.value)}>
                    <option>1-20 salariés</option>
                    <option>20-100 salariés</option>
                    <option>100-250 salariés</option>
                    <option>250+ salariés</option>
                  </select>
                </div>
              </div>
              <div className="auth-field">
                <label>Téléphone</label>
                <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
            </>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
          </div>
          <div className="auth-field">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
          </div>

          {err && <div className="auth-err">{err}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-switch">
          Déjà inscrit ? <a onClick={() => router.push("/login")}>Se connecter</a>
        </div>
      </div>
    </div>
  );
}
