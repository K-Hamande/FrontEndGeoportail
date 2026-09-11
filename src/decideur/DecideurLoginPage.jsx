import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { saveDecideurAuth } from "../shared/decideurAuth";

function DecideurLoginPage() {
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficher, setAfficher] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, motDePasse }),
      });

      if (!response.ok) {
        setErreur("Identifiants ou mot de passe incorrects. Veuillez réessayer.");
        return;
      }

      const data = await response.json();
      saveDecideurAuth(data);
      window.location.href = "/";
    } catch {
      setErreur("Erreur de connexion. Vérifiez votre connexion réseau.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="decideur-login-page">
      <img src="/logo_anptic_ok.png" alt="" className="login-bg-logo" aria-hidden="true" />

      <div className="decideur-login-card">
        <div className="decideur-login-logo">
          <svg viewBox="0 0 60 60" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
            <rect width="60" height="30" y="0" fill="#EF2B2D" />
            <rect width="60" height="30" y="30" fill="#009E49" />
            <path d="M30 20 l3.5 10.8 11.3 0 -9.15 6.65 3.5 10.8 -9.15 -6.67 -9.15 6.67 3.5 -10.8 -9.15 -6.65 11.3 0 z" fill="#FCD116" />
          </svg>
        </div>

        <h1 className="decideur-login-title">Accès décideur </h1>
        <p className="decideur-login-subtitle">GéoPortail RESINA:Supervision du réseau national</p>

        <form onSubmit={handleSubmit}>
          <div className="decideur-login-field">
            <label>Identifiant</label>
            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)}
              required autoFocus placeholder="votre.login" />
          </div>

          <div className="decideur-login-field">
            <label>Mot de passe</label>
            <div className="decideur-login-password">
              <input type={afficher ? "text" : "password"} value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)} required />
              <button type="button" className="decideur-login-eye"
                onClick={() => setAfficher((v) => !v)}
                aria-label={afficher ? "Masquer" : "Afficher"}>
                {afficher ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {erreur && <p className="decideur-login-error">{erreur}</p>}

          <button type="submit" className="decideur-login-btn" disabled={chargement}>
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="decideur-login-footer">
          ANPTIC — Ministère de la Transition Digitale
        </p>
      </div>
    </div>
  );
}

export default DecideurLoginPage;