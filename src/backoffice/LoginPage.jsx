import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { adminGet } from "../shared/backofficeApiClient";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [seSouvenir, setSeSouvenir] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const authHeader = "Basic " + btoa(`${username}:${password}`);

    try {
      await adminGet("/backoffice/api/v1/sites", authHeader);
      login(username, password, seSouvenir);
      navigate("/backoffice");
    } catch (err) {
      setErreur("Identifiants incorrects.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="login-page">
      {/* Logo ANPTIC en filigrane, en fond de page */}
      <img src="/logo_anptic_ok.png" alt="" className="login-bg-logo" aria-hidden="true" />

      <div className="login-card">
        {/* Emblème du Burkina Faso (étoile jaune sur fond rouge/vert du drapeau) */}
        <div className="login-icon">
          <svg viewBox="0 0 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="60" height="30" y="0" fill="#EF2B2D" />
            <rect width="60" height="30" y="30" fill="#009E49" />
            <path
              d="M30 20 l3.5 10.8 11.3 0 -9.15 6.65 3.5 10.8 -9.15 -6.67 -9.15 6.67 3.5 -10.8 -9.15 -6.65 11.3 0 z"
              fill="#FCD116"
            />
          </svg>
        </div>

        <h1 className="login-title">Backoffice DEST/DIG</h1>
        <p className="login-subtitle">Géoportail RESINA — Accès réservé aux agents techniques</p>

        <form onSubmit={handleSubmit}>
          <label className="login-label">Identifiant</label>
          <input
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />

          <label className="login-label">Mot de passe</label>
          <div className="login-password-wrapper">
            <input
              className="login-input"
              type={afficherMotDePasse ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setAfficherMotDePasse((v) => !v)}
              aria-label={afficherMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {afficherMotDePasse ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={seSouvenir}
              onChange={(e) => setSeSouvenir(e.target.checked)}
            />
            Se souvenir de moi
          </label>

          {erreur && <p className="login-error">{erreur}</p>}

          <button className="btn-primary login-submit" type="submit" disabled={chargement}>
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;