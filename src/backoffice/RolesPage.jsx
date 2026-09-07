import Topbar from "./Topbar";

// Page d'information statique : GéoPortail RESINA n'a pas (encore) de
// systeme de permissions configurable en base - les 3 roles ci-dessous
// sont ceux definis en dur dans le code (AdminUser.Role). Cette page
// documente simplement ce qu'ils signifient, a titre de reference pour
// les administrateurs. Elle ne permet aucune modification.
const ROLES = [
  {
    code: "SUPER_ADMIN",
    label: "Super administrateur",
    icon: "👑",
    color: "#C79A2E",
    tagline: "Le contrôle total du Backoffice",
    particularite: "Seul rôle habilité à gérer les comptes administrateurs",
    capacites: [
      "Accès complet à tous les modules du Backoffice",
      "Gestion des comptes administrateurs : création, modification, désactivation, réinitialisation de mot de passe, suppression",
      "Accès à l'ensemble des sites par défaut",
    ],
  },
  {
    code: "ADMIN_DEST",
    label: "Administrateur DEST",
    icon: "📡",
    color: "#0A3D7A",
    tagline: "Direction de l'Exploitation",
    particularite: "Gestion opérationnelle complète, sans accès aux comptes admin",
    capacites: [
      "Sites, équipements et cartographie",
      "Supervision réseau",
      "Comptes décideurs",
      "Accès global ou restreint à certains sites, selon l'attribution faite à la création du compte",
    ],
  },
  {
    code: "ADMIN_DIG",
    label: "Administrateur DIG",
    icon: "💻",
    color: "#0D9B5A",
    tagline: "Direction de l'Infogérance",
    particularite: "Mêmes fonctionnalités qu'ADMIN_DEST — seule la direction d'appartenance diffère",
    capacites: [
      "Sites, équipements et cartographie",
      "Supervision réseau",
      "Comptes décideurs",
      "Accès global ou restreint à certains sites, selon l'attribution faite à la création du compte",
    ],
  },
];

// Comparatif synthetique - reprend exactement les memes informations que
// les descriptions ci-dessus, presentees sous forme de tableau pour une
// lecture plus rapide.
const MATRICE = [
  { label: "Sites, équipements & cartographie", valeurs: [true, true, true] },
  { label: "Supervision réseau", valeurs: [true, true, true] },
  { label: "Comptes décideurs", valeurs: [true, true, true] },
  { label: "Comptes administrateurs Backoffice", valeurs: [true, false, false] },
  { label: "Accès aux sites", valeurs: ["Tous par défaut", "Global ou restreint", "Global ou restreint"] },
];

function CelluleMatrice({ valeur }) {
  if (valeur === true) {
    return <span className="roles-matrix-check" title="Oui">✓</span>;
  }
  if (valeur === false) {
    return <span className="roles-matrix-cross" title="Non">—</span>;
  }
  return <span className="roles-matrix-text">{valeur}</span>;
}

function RolesPage() {
  return (
    <>
      <Topbar title="Rôles" subtitle="Rôles disponibles pour les comptes Backoffice" />
      <div className="backoffice-content">

        <div className="roles-hero">
          <div className="roles-hero-icon">🔐</div>
          <div>
            <h2 className="roles-hero-title">Rôles Backoffice</h2>
            <p className="roles-hero-text">
              Trois rôles administrateur sont définis en dur dans le code de l'application. Cette page les documente
              à titre de référence pour les administrateurs — elle ne permet aucune modification.
            </p>
          </div>
        </div>

        <div className="roles-grid">
          {ROLES.map((r) => (
            <div key={r.code} className="role-card" style={{ "--role-accent": r.color }}>
              <div className="role-card-top">
                <div className="role-card-icon" style={{ background: r.color + "1A", color: r.color }}>
                  {r.icon}
                </div>
                <span className="role-card-code">{r.code}</span>
              </div>
              <h3 className="role-card-title">{r.label}</h3>
              <p className="role-card-tagline">{r.tagline}</p>

              <ul className="role-card-list">
                {r.capacites.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>

              <div className="role-card-highlight" style={{ background: r.color + "12", color: r.color }}>
                ★ {r.particularite}
              </div>
            </div>
          ))}
        </div>

        <div className="panel roles-matrix-panel">
          <div className="panel-header">
            <h2>Comparatif des permissions</h2>
          </div>
          <div className="roles-matrix-wrap">
            <table className="admin-table roles-matrix">
              <thead>
                <tr>
                  <th>Permission</th>
                  {ROLES.map((r) => (
                    <th key={r.code}>
                      <span className="roles-matrix-head">
                        <span className="roles-matrix-dot" style={{ background: r.color }}></span>
                        {r.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRICE.map((ligne) => (
                  <tr key={ligne.label}>
                    <td className="roles-matrix-label">{ligne.label}</td>
                    {ligne.valeurs.map((v, i) => (
                      <td key={i} style={{ textAlign: "center" }}>
                        <CelluleMatrice valeur={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* <div className="roles-note">
          <span className="roles-note-icon">ℹ️</span>
          <p>
            La gestion fine des permissions par rôle (au-delà de cette distinction) n'existe pas encore dans
            l'application — cette page sera complétée si un système de permissions configurables est mis en place.
          </p>
        </div> */}

      </div>
    </>
  );
}

export default RolesPage;