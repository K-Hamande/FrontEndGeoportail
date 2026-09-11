import { NavLink } from "react-router-dom";
import { Building2, Map, Bell } from "lucide-react";

// Le compteur d'alertes est desormais fourni par le parent (DecideurLayout)
// plutot que recupere ici via API - ce composant est rendu DEUX FOIS
// (version mobile + version desktop integree au bandeau bleu), un seul
// appel API partage evite de le declencher deux fois pour rien.
function BottomNav({ alertCount = 0 }) {
  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={linkClass}>
        <span className="nav-icon"><Building2 size={20} /></span>
        Mon site
      </NavLink>
      <NavLink to="/carte" className={linkClass}>
        <span className="nav-icon"><Map size={20} /></span>
        Carte
      </NavLink>
      <NavLink to="/alertes" className={linkClass}>
        <span className="nav-icon"><Bell size={20} /></span>
        Alertes
        {alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
      </NavLink>
    </nav>
  );
}

export default BottomNav;
