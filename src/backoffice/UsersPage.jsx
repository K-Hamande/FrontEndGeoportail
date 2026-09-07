import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost, adminDelete } from "../shared/backofficeApiClient";
import UserFormModal from "./UserFormModal";
import ResetPasswordModal from "./ResetPasswordModal";
import Topbar from "./Topbar";
import ErrorBanner from "../shared/ErrorBanner";

// Palette alignee sur la page Roles - meme code couleur pour que
// l'identite visuelle d'un role soit reconnaissable d'une page a l'autre.
const ROLE_META = {
  SUPER_ADMIN: { label: "Super administrateur", icon: "👑", color: "#C79A2E" },
  ADMIN_DEST: { label: "Administrateur DEST", icon: "📡", color: "#0A3D7A" },
  ADMIN_DIG: { label: "Administrateur DIG", icon: "💻", color: "#0D9B5A" },
};
const ROLE_INCONNU = { label: "Rôle inconnu", icon: "❓", color: "#6B7280" };

function roleMeta(role) {
  return ROLE_META[role] ?? ROLE_INCONNU;
}

function initiales(nomComplet, login) {
  const source = (nomComplet || login || "").trim();
  if (!source) return "?";
  const mots = source.split(/\s+/).filter(Boolean);
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return source.substring(0, 2).toUpperCase();
}

function UsersPage() {
  const { getAuthHeader, auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [modaleCreation, setModaleCreation] = useState(false);
  const [userAModifier, setUserAModifier] = useState(null);
  const [userResetId, setUserResetId] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("");

  function charger() {
    setChargement(true);
    adminGet("/backoffice/api/v1/users", getAuthHeader())
      .then(setUsers)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function toggleActive(user) {
    const action = user.actif ? "deactivate" : "activate";
    try {
      await adminPost(`/backoffice/api/v1/users/${user.id}/${action}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(user) {
    if (!window.confirm(`Supprimer définitivement le compte "${user.login}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await adminDelete(`/backoffice/api/v1/users/${user.id}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  // Stats globales - toujours calculees sur l'ensemble des comptes, pas
  // sur la liste filtree, pour rester une photographie stable du parc.
  const totalComptes = users.length;
  const nbActifs = users.filter((u) => u.actif).length;
  const nbDesactives = totalComptes - nbActifs;
  const nbSuperAdmins = users.filter((u) => u.role === "SUPER_ADMIN").length;
  const pctActifs = totalComptes > 0 ? Math.round((nbActifs / totalComptes) * 100) : 0;

  const usersFiltres = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    return users.filter((u) => {
      if (filtreRole && u.role !== filtreRole) return false;
      if (t) {
        return (u.login || "").toLowerCase().includes(t) || (u.nomComplet || "").toLowerCase().includes(t);
      }
      return true;
    });
  }, [users, recherche, filtreRole]);

  const aDesFiltres = recherche || filtreRole;

  return (
    <>
      <Topbar title="Utilisateurs" subtitle="Comptes administrateurs DEST/DIG" onRefresh={charger} chargement={chargement} />

      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        {!chargement && (
          <div className="kpi-grid-v2" style={{ marginBottom: "20px" }}>
            <div className="kpi-card-v2">
              <div className="kpi-card-icon kpi-icon-navy">👥</div>
              <div>
                <div className="kpi-card-label">COMPTES BACKOFFICE</div>
                <div className="kpi-card-value">{totalComptes}</div>
                <div className="kpi-card-sub">comptes administrateurs</div>
              </div>
            </div>
            <div className="kpi-card-v2">
              <div className="kpi-card-icon kpi-icon-green">✓</div>
              <div>
                <div className="kpi-card-label">ACTIFS</div>
                <div className="kpi-card-value kpi-value-green">{nbActifs}</div>
                <div className="kpi-card-sub">{pctActifs}% du total</div>
              </div>
            </div>
            <div className="kpi-card-v2">
              <div className="kpi-card-icon kpi-icon-red">⏸</div>
              <div>
                <div className="kpi-card-label">DÉSACTIVÉS</div>
                <div className="kpi-card-value kpi-value-red">{nbDesactives}</div>
                <div className="kpi-card-sub">accès bloqué</div>
              </div>
            </div>
            <div className="kpi-card-v2">
              <div className="kpi-card-icon kpi-icon-gold">👑</div>
              <div>
                <div className="kpi-card-label">SUPER ADMINISTRATEURS</div>
                <div className="kpi-card-value">{nbSuperAdmins}</div>
                <div className="kpi-card-sub">accès complet</div>
              </div>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-header">
            <h2>Comptes Backoffice</h2>
            <div className="panel-header-actions">
              <button className="btn-primary" onClick={() => setModaleCreation(true)}>
                + Nouvel utilisateur
              </button>
            </div>
          </div>

          <div className="users-toolbar">
            <input
              className="attention-search"
              style={{ flex: 1, minWidth: "220px" }}
              placeholder="Rechercher un login ou un nom…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <div className="users-role-filters">
              {["", "SUPER_ADMIN", "ADMIN_DEST", "ADMIN_DIG"].map((r) => (
                <button
                  key={r || "tous"}
                  className={`pagination-btn ${filtreRole === r ? "pagination-btn-active" : ""}`}
                  onClick={() => setFiltreRole(r)}
                >
                  {r === "" ? "Tous" : roleMeta(r).label}
                </button>
              ))}
            </div>
            {aDesFiltres && (
              <button className="btn-outline" style={{ fontSize: "11px" }} onClick={() => { setRecherche(""); setFiltreRole(""); }}>
                ✕ Effacer
              </button>
            )}
            <span className="users-toolbar-count">{usersFiltres.length} compte{usersFiltres.length > 1 ? "s" : ""}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Rôle</th>
                <th>Sites</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersFiltres.map((user) => {
                const meta = roleMeta(user.role);
                const estSoiMeme = user.login?.toLowerCase() === auth?.username?.toLowerCase();
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-identity-cell">
                        <div className="user-avatar" style={{ background: meta.color + "1A", color: meta.color }}>
                          {initiales(user.nomComplet, user.login)}
                        </div>
                        <div>
                          <div className="user-login">{user.login}</div>
                          <div className="user-fullname">{user.nomComplet}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge" style={{ background: meta.color + "14", color: meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td>
                      {user.sitesAutorises?.length > 0 ? (
                        <div className="user-sites-chips">
                          {user.sitesAutorises.map((s) => (
                            <span key={s} className="user-site-chip">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="user-sites-all">🌐 Tous les sites</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${user.actif ? "pill-ok" : "pill-ko"}`}>
                        ● {user.actif ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="table-actions">
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button className="user-btn user-btn-edit" onClick={() => setUserAModifier(user)}>
                          ✏️ Modifier
                        </button>
                        <button className="user-btn user-btn-reset" onClick={() => setUserResetId(user.id)}>
                          🔑 Réinitialiser
                        </button>
                        <button className="user-btn user-btn-toggle" onClick={() => toggleActive(user)}>
                          {user.actif ? "⏸ Désactiver" : "▶ Activer"}
                        </button>
                        <button
                          className="user-btn user-btn-delete"
                          disabled={estSoiMeme}
                          title={estSoiMeme ? "Vous ne pouvez pas supprimer votre propre compte" : undefined}
                          onClick={() => supprimer(user)}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {usersFiltres.length === 0 && (
            <p style={{ color: "var(--bo-ink-muted)", textAlign: "center", padding: "24px" }}>
              {users.length === 0 ? "Aucun utilisateur." : "Aucun compte ne correspond à ces critères."}
            </p>
          )}
        </div>

        {modaleCreation && (
          <UserFormModal onClose={() => setModaleCreation(false)} onSaved={() => { setModaleCreation(false); charger(); }} />
        )}

        {userAModifier && (
          <UserFormModal
            userAModifier={userAModifier}
            onClose={() => setUserAModifier(null)}
            onSaved={() => { setUserAModifier(null); charger(); }}
          />
        )}

        {userResetId != null && (
          <ResetPasswordModal userId={userResetId} onClose={() => setUserResetId(null)} onSaved={() => setUserResetId(null)} />
        )}
      </div>
    </>
  );
}

export default UsersPage;