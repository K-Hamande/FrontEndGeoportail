import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost, adminPut, adminDelete } from "../shared/backofficeApiClient";
import { useOutletContext } from "react-router-dom";
import { Pencil, Trash2, Pause, Play } from "lucide-react";
import Topbar from "./Topbar";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

const ROLE_LABELS = { DECIDEUR: "Décideur ministériel", LAMBDA: "Utilisateur lambda" };

function DecideurUsersPage() {
  const { getAuthHeader } = useAuth();
  const [users, setUsers] = useState([]);
  const [ministeres, setMinisteres] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [userEdite, setUserEdite] = useState(null);
  const [form, setForm] = useState({ login: "", nomComplet: "", email: "", motDePasse: "", role: "DECIDEUR", ministere: "" });

  function charger() {
    adminGet("/backoffice/api/v1/decideur-users", getAuthHeader()).then(setUsers).catch((e) => setErreur(e.message));
    adminGet("/backoffice/api/v1/ministry-tokens/ministeres", getAuthHeader()).then(setMinisteres).catch(() => {});
  }

  useEffect(() => { charger(); }, []);

  function ouvrirCreation() {
    setUserEdite(null);
    setForm({ login: "", nomComplet: "", email: "", motDePasse: "", role: "DECIDEUR", ministere: "" });
    setModaleOuverte(true);
  }

  function ouvrirModification(user) {
    setUserEdite(user);
    setForm({ login: user.login, nomComplet: user.nomComplet, email: user.email || "", motDePasse: "", role: user.role, ministere: user.ministere || "" });
    setModaleOuverte(true);
  }

  async function soumettre(e) {
    e.preventDefault();
    try {
      if (userEdite) {
        await adminPut(`/backoffice/api/v1/decideur-users/${userEdite.id}`, getAuthHeader(), form);
      } else {
        await adminPost("/backoffice/api/v1/decideur-users", getAuthHeader(), form);
      }
      setModaleOuverte(false);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function toggleActive(user) {
    const action = user.actif ? "deactivate" : "activate";
    try {
      await adminPost(`/backoffice/api/v1/decideur-users/${user.id}/${action}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(user) {
    if (!window.confirm(`Supprimer définitivement le compte décideur "${user.login}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await adminDelete(`/backoffice/api/v1/decideur-users/${user.id}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <>
      <Topbar title="Comptes Décideurs" subtitle="Gestion des accès à l'interface décideur" onRefresh={charger} />
      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        <div className="panel">
          <div className="panel-header">
            <h2>Utilisateurs décideurs <span className="attention-count" style={{ background: "var(--bo-primary)" }}>{users.length}</span></h2>
            <div className="panel-header-actions">
              <button className="btn-primary" onClick={ouvrirCreation}>+ Nouveau compte</button>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Login</th>
                <th>Nom complet</th>
                <th>Email</th>
                <th>Alertes email</th>
                <th>Rôle</th>
                <th>Ministère</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="site-name-cell">{user.login}</td>
                  <td>{user.nomComplet}</td>
                  <td>{user.email || <span style={{ color: "var(--bo-ink-muted)" }}>—</span>}</td>
                  <td>
                    <span className={`status-pill ${user.alertesActivees ? "pill-ok" : "pill-warn"}`}>
                      {user.alertesActivees ? "Activées" : "Désactivées"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${user.role === "DECIDEUR" ? "pill-ok" : "pill-warn"}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>{user.ministere || <span style={{ color: "var(--bo-ink-muted)" }}>Tous les sites</span>}</td>
                  <td>
                    <span className={`status-pill ${user.actif ? "pill-ok" : "pill-ko"}`}>
                      {user.actif ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="btn-voir" onClick={() => ouvrirModification(user)}><Pencil size={12} /> Modifier</button>
                    <button className="btn-voir" onClick={() => toggleActive(user)}>
                      {user.actif ? <><Pause size={12} /> Désactiver</> : <><Play size={12} /> Activer</>}
                    </button>
                    <button className="btn-voir" style={{ color: "var(--bo-ko, #D93535)" }} onClick={() => supprimer(user)}>
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && <p>Aucun compte décideur créé.</p>}
        </div>

        {modaleOuverte && (
          <div className="modal-overlay" onClick={() => setModaleOuverte(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h2>{userEdite ? "Modifier le compte" : "Nouveau compte décideur"}</h2>
              <form onSubmit={soumettre}>
                <div className="form-grid">
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Login *</label>
                    <input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })}
                      required disabled={!!userEdite} />
                  </div>
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Nom complet *</label>
                    <input value={form.nomComplet} onChange={(e) => setForm({ ...form, nomComplet: e.target.value })} required />
                  </div>
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Email (pour les alertes)</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="decideur@exemple.bf" />
                  </div>
                  <div className="form-field" style={{ gridColumn: "span 2" }}>
                    <label>Mot de passe {userEdite ? "(laisser vide pour ne pas changer)" : "*"}</label>
                    <input type="password" value={form.motDePasse}
                      onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                      required={!userEdite} />
                  </div>
                  <div className="form-field">
                    <label>Rôle *</label>
                    <SearchableSelect
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value, ministere: "" })}
                      disabled={!!userEdite}
                    >
                      <option value="DECIDEUR">Décideur ministériel</option>
                      <option value="LAMBDA">Utilisateur lambda</option>
                    </SearchableSelect>
                    {userEdite && (
                      <span className="field-hint">
                        Le rôle ne peut pas être modifié après la création. Supprimez le compte et recréez-le si besoin.
                      </span>
                    )}
                  </div>
                  {form.role === "DECIDEUR" && (
                    <div className="form-field">
                      <label>Ministère *</label>
                      <SearchableSelect value={form.ministere} onChange={(e) => setForm({ ...form, ministere: e.target.value })} required>
                        <option value="">Choisir un ministère</option>
                        {ministeres.map((m) => <option key={m} value={m}>{m}</option>)}
                      </SearchableSelect>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setModaleOuverte(false)}>Annuler</button>
                  <button type="submit" className="btn-primary">{userEdite ? "Enregistrer" : "Créer"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DecideurUsersPage;