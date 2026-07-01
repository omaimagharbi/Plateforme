"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur de connexion.");
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
          <button className="active">Connexion</button>
          <button onClick={() => router.push("/signup")}>Inscription</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
          </div>
          <div className="auth-field">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-switch">
          Pas encore de compte ? <a onClick={() => router.push("/signup")}>S'inscrire</a>
        </div>
      </div>
    </div>
  );
}
