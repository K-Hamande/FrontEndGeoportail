import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import { estConnecteDecideur, getDecideurAuth, clearDecideurAuth } from "../shared/decideurAuth";

function LambdaLayout({ children }) {
  const connecte = estConnecteDecideur();
  const auth = getDecideurAuth();
  const navigate = useNavigate();

  function logout() {
    clearDecideurAuth();
    navigate("/login");
  }

  return (
    <div className="lambda-shell">
      <header className="lambda-header">
        <div className="flag-bar"></div>
        <div className="lambda-header-inner">
          <div className="lambda-brand">
            <img src="/logo_anptic_ok.png" alt="ANPTIC" className="lambda-logo" />
            <div>
              <div className="lambda-title">GéoPortail RESINA</div>
              <div className="lambda-subtitle">État du réseau national</div>
            </div>
          </div>

          {/* Visiteur anonyme (cas normal) : simple lien vers l'espace
              decideur. Ancien compte LAMBDA encore connecte (systeme
              conserve pour compatibilite) : conserve la deconnexion. */}
          {connecte ? (
            <div className="lambda-user">
              <span className="lambda-user-name">{auth?.role}</span>
              <button className="lambda-logout" onClick={logout} title="Se déconnecter"><LogOut size={15} /></button>
            </div>
          ) : (
            <nav className="lambda-nav">
              <button className="lambda-nav-btn" onClick={() => navigate("/login")}>
                <KeyRound size={14} /> Connexion décideur
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="lambda-content">{children}</main>
    </div>
  );
}

export default LambdaLayout;
