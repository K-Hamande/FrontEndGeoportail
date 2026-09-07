import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminDelete } from "../shared/backofficeApiClient";
import Topbar from "./Topbar";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

function NotificationsAdminPage() {
  const { getAuthHeader } = useAuth();
  const [sites, setSites] = useState([]);
  const [siteFiltre, setSiteFiltre] = useState("");
  const [tokens, setTokens] = useState([]);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    adminGet("/backoffice/api/v1/sites", getAuthHeader())
      .then(setSites)
      .catch((err) => setErreur(err.message));
  }, []);

  function charger() {
    const suffixe = siteFiltre ? `?siteId=${siteFiltre}` : "";
    adminGet(`/backoffice/api/v1/notifications${suffixe}`, getAuthHeader())
      .then(setTokens)
      .catch((err) => setErreur(err.message));
  }

  useEffect(() => {
    charger();
  }, [siteFiltre]);

  async function supprimer(id) {
    try {
      await adminDelete(`/backoffice/api/v1/notifications/${id}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <>
      <Topbar title="Notifications push" subtitle="Enregistrement et suppression des destinataires par site" onRefresh={charger} />

      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        <div className="panel">
          <div className="panel-header">
            <h2>Destinataires enregistrés</h2>
            <div className="panel-header-actions">
              <SearchableSelect value={siteFiltre} onChange={(e) => setSiteFiltre(e.target.value)}>
                <option value="">Tous les sites</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>{site.nom}</option>
                ))}
              </SearchableSelect>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Profil</th>
                <th>Site</th>
                <th>Plateforme</th>
                <th>Enregistré le</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className="site-name-cell">{t.profil}</td>
                  <td>{t.siteNom}</td>
                  <td>{t.plateforme}</td>
                  <td>{new Date(t.enregistreLe).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <span className={`status-badge ${t.actif ? "badge-ok" : "badge-unknown"}`}>
                      {t.actif ? "Actif" : "Expiré"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-danger" style={{ color: "white" }} onClick={() => supprimer(t.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tokens.length === 0 && <p>Aucun destinataire enregistré pour ce filtre.</p>}
        </div>
      </div>
    </>
  );
}

export default NotificationsAdminPage;