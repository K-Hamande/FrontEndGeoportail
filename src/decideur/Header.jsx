import { LogOut } from "lucide-react";

function Header({ nav, children, onLogout, nomComplet, role }) {
  return (
    <header className="app-header">
      <div className="flag-bar"></div>
      <div className="header-main-row">
        <div className="header-top">
          <div className="header-icon">R</div>
          <div className="header-titles">
            <div className="header-title">GéoPortail RESINA</div>
            <div className="header-subtitle">Tableau de bord — Usage Ministériel</div>
          </div>
          <div className="live-badge">
            <span className="live-dot"></span>
            EN DIRECT
          </div>
        </div>
        {nav}
        {children}
        {nomComplet && (
          <div className="header-user">
            <span className="header-user-name">{nomComplet}</span>
            <span className="header-user-role">{role === "LAMBDA" ? "Observateur" : "Décideur"}</span>
            <button className="header-logout-btn" onClick={onLogout} title="Se déconnecter"><LogOut size={15} /></button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
