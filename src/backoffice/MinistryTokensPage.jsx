import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost } from "../shared/backofficeApiClient";
import Topbar from "./Topbar";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

function MinistryTokensPage() {
  const { getAuthHeader } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [ministeres, setMinisteres] = useState([]);
  const [ministereChoisi, setMinistereChoisi] = useState("");
  const [libelle, setLibelle] = useState("");
  const [erreur, setErreur] = useState(null);
  const [creation, setCreation] = useState(false);
  const [copieId, setCopieId] = useState(null);

  function charger() {
    adminGet("/backoffice/api/v1/ministry-tokens", getAuthHeader()).then(setTokens).catch((err) => setErreur(err.message));
    adminGet("/backoffice/api/v1/ministry-tokens/ministeres", getAuthHeader())
      .then((data) => {
        setMinisteres(data);
        if (data.length > 0 && !ministereChoisi) setMinistereChoisi(data[0]);
      })
      .catch((err) => setErreur(err.message));
  }

  useEffect(() => {
    charger();
  }, []);

  function construireLien(token) {
    return `${window.location.origin}/?access=${token}`;
  }

  async function creerLien(e) {
    e.preventDefault();
    setCreation(true);
    setErreur(null);
    try {
      await adminPost("/backoffice/api/v1/ministry-tokens", getAuthHeader(), {
        ministere: ministereChoisi,
        libelle: libelle || ministereChoisi,
      });
      setLibelle("");
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setCreation(false);
    }
  }

  async function toggleActif(token) {
    const action = token.actif ? "deactivate" : "activate";
    try {
      await adminPost(`/backoffice/api/v1/ministry-tokens/${token.id}/${action}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function copierLien(token) {
    navigator.clipboard.writeText(construireLien(token.token));
    setCopieId(token.id);
    setTimeout(() => setCopieId(null), 2000);
  }

  return (
    <>
      <Topbar
        title="Liens Ministères"
        subtitle="Accès décideur restreint par ministère — chaque lien ne montre que les sites du ministère associé"
        onRefresh={charger}
      />

      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        <div className="panel">
          <div className="panel-header">
            <h2>Générer un nouveau lien</h2>
          </div>

          <form onSubmit={creerLien} className="form-grid">
            <div className="form-field">
              <label>Ministère *</label>
              <SearchableSelect value={ministereChoisi} onChange={(e) => setMinistereChoisi(e.target.value)} required>
                {ministeres.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </SearchableSelect>
            </div>
            <div className="form-field">
              <label>Libellé (optionnel)</label>
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder={ministereChoisi} />
            </div>
            <div className="form-field" style={{ alignSelf: "flex-end" }}>
              <button type="submit" className="btn-primary" disabled={creation || !ministereChoisi}>
                {creation ? "Génération…" : "+ Générer le lien"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Liens existants</h2>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Ministère</th>
                <th>Libellé</th>
                <th>Lien</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className="site-name-cell">{t.ministere}</td>
                  <td>{t.libelle}</td>
                  <td>
                    <code style={{ fontSize: "11px" }}>{construireLien(t.token).slice(0, 40)}…</code>
                  </td>
                  <td>
                    <span className={`status-badge ${t.actif ? "badge-ok" : "badge-unknown"}`}>
                      {t.actif ? "Actif" : "Révoqué"}
                    </span>
                  </td>
                  <td>{t.creeLe ? new Date(t.creeLe).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="table-actions">
                    <button className="btn-link" onClick={() => copierLien(t)}>
                      {copieId === t.id ? "Copié !" : "Copier le lien"}
                    </button>
                    <button className="btn btn-info" style={{ color: "white" }} onClick={() => toggleActif(t)}>
                      {t.actif ? "Révoquer" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tokens.length === 0 && <p>Aucun lien généré pour l'instant.</p>}
        </div>
      </div>
    </>
  );
}

export default MinistryTokensPage;