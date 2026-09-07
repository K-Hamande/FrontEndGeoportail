import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost, adminPut } from "../shared/backofficeApiClient";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

// Sert a la fois pour la CREATION (userAModifier absent) et la
// MODIFICATION (userAModifier fourni) - evite de dupliquer tout le
// formulaire pour une difference de quelques champs (login/mot de passe
// non modifiables une fois le compte cree).
function UserFormModal({ userAModifier, onClose, onSaved }) {
  const { getAuthHeader } = useAuth();
  const [sites, setSites] = useState([]);
  const estModification = Boolean(userAModifier);

  const [form, setForm] = useState({
    login: userAModifier?.login ?? "",
    nomComplet: userAModifier?.nomComplet ?? "",
    motDePasse: "",
    role: userAModifier?.role ?? "ADMIN_DEST",
  });
  const [sitesSelectionnes, setSitesSelectionnes] = useState(
    userAModifier?.sitesAutorises ?? []
  );
  const [filtreSites, setFiltreSites] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    adminGet("/backoffice/api/v1/sites", getAuthHeader()).then(setSites).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleSite(siteId) {
    setSitesSelectionnes((prev) =>
      prev.includes(siteId) ? prev.filter((s) => s !== siteId) : [...prev, siteId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setEnregistrement(true);
    try {
      const sitesAEnvoyer = form.role === "SUPER_ADMIN" ? [] : sitesSelectionnes;

      if (estModification) {
        await adminPut(`/backoffice/api/v1/users/${userAModifier.id}`, getAuthHeader(), {
          nomComplet: form.nomComplet,
          role: form.role,
          sitesAutorises: sitesAEnvoyer,
        });
      } else {
        await adminPost("/backoffice/api/v1/users", getAuthHeader(), {
          ...form,
          sitesAutorises: sitesAEnvoyer,
        });
      }
      onSaved();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  const roleEstGlobalParDefaut = form.role === "SUPER_ADMIN";

  const texteFiltre = filtreSites.trim().toLowerCase();
  const sitesFiltres = texteFiltre
    ? sites.filter(
        (site) =>
          site.nom.toLowerCase().includes(texteFiltre) ||
          site.ville?.toLowerCase().includes(texteFiltre)
      )
    : sites;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{estModification ? "Modifier l'utilisateur" : "Nouvel utilisateur Backoffice"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: "span 2" }}>
              <label>Identifiant de connexion {estModification ? "" : "*"}</label>
              <input
                name="login"
                value={form.login}
                onChange={handleChange}
                required={!estModification}
                disabled={estModification}
              />
              {estModification && (
                <span className="field-hint">L'identifiant de connexion ne peut pas être modifié.</span>
              )}
            </div>
            <div className="form-field" style={{ gridColumn: "span 2" }}>
              <label>Nom complet *</label>
              <input name="nomComplet" value={form.nomComplet} onChange={handleChange} required />
            </div>
            {!estModification && (
              <div className="form-field" style={{ gridColumn: "span 2" }}>
                <label>Mot de passe initial *</label>
                <input name="motDePasse" type="password" value={form.motDePasse} onChange={handleChange} required />
              </div>
            )}
            <div className="form-field" style={{ gridColumn: "span 2" }}>
              <label>Rôle *</label>
              <SearchableSelect name="role" value={form.role} onChange={handleChange}>
                <option value="SUPER_ADMIN">Super administrateur (accès global)</option>
                <option value="ADMIN_DEST">Administrateur DEST</option>
                <option value="ADMIN_DIG">Administrateur DIG</option>
              </SearchableSelect>
            </div>
          </div>

          {!roleEstGlobalParDefaut && (
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)" }}>
                Sites autorisés (aucune case cochée = accès à tous les sites)
                {sitesSelectionnes.length > 0 && ` — ${sitesSelectionnes.length} sélectionné(s)`}
              </label>
              <input
                type="text"
                className="filter-input"
                style={{ width: "100%", marginTop: "6px" }}
                placeholder="Rechercher un site par nom ou ville…"
                value={filtreSites}
                onChange={(e) => setFiltreSites(e.target.value)}
              />
              <div className="site-checkbox-list">
                {sitesFiltres.length === 0 && (
                  <p className="field-hint" style={{ margin: "6px 0" }}>Aucun site ne correspond à « {filtreSites} ».</p>
                )}
                {sitesFiltres.map((site) => (
                  <label key={site.siteId} className="site-checkbox-item">
                    <input
                      type="checkbox"
                      checked={sitesSelectionnes.includes(site.siteId)}
                      onChange={() => toggleSite(site.siteId)}
                    />
                    {site.nom}
                    {site.ville && <span style={{ color: "var(--color-text-muted)" }}> — {site.ville}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <ErrorBanner message={erreur} />

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={enregistrement}>
              {enregistrement ? "Enregistrement..." : estModification ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;