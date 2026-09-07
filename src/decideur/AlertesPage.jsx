import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../shared/apiClient";
import { getStatusColor } from "../shared/statusStyles";
import { formaterTempsRelatif } from "../shared/timeFormat";
import { useSiteSelection } from "../shared/SiteSelectionContext";
import DecideurLayout from "./DecideurLayout";

const CLE_LUS = "resina-alertes-lues";
const CLE_BANNIERE_MASQUEE = "resina-banniere-masquee";

function chargerIdsLus() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLE_LUS) ?? "[]"));
  } catch {
    return new Set();
  }
}

function badgeClass(status) {
  if (status === "KO") return "badge-ko";
  if (status === "WARN") return "badge-warn";
  return "badge-ok";
}

function badgeLabel(status) {
  if (status === "KO") return "✕ Indisponible";
  if (status === "WARN") return "⚠ Alerte";
  return "✓ Actif";
}

function AlertesPage() {
  const { choisirSite } = useSiteSelection();
  const [incidents, setIncidents] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [idsLus, setIdsLus] = useState(chargerIdsLus);
  const [alertesActivees, setAlertesActivees] = useState(false);
  const [banniereVisible, setBanniereVisible] = useState(
    sessionStorage.getItem(CLE_BANNIERE_MASQUEE) !== "true"
  );

  function charger() {
    apiGet("/api/v1/incidents").then(setIncidents).catch((err) => setErreur(err.message));
  }

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 30000);

    // Etat reel de la preference (persistant, cote serveur) - si le
    // decideur a deja active les alertes sur un autre appareil/session,
    // le bandeau ne doit pas reapparaitre.
    apiGet("/api/v1/decideur/alertes")
      .then((pref) => setAlertesActivees(pref.activees))
      .catch(() => {});

    return () => clearInterval(intervalle);
  }, []);

  function marquerCommeLu(id) {
    const nouveaux = new Set(idsLus);
    nouveaux.add(id);
    setIdsLus(nouveaux);
    localStorage.setItem(CLE_LUS, JSON.stringify([...nouveaux]));
  }

  function toutMarquerLu() {
    const tousLesIds = new Set(incidents.map((i) => i.id));
    setIdsLus(tousLesIds);
    localStorage.setItem(CLE_LUS, JSON.stringify([...tousLesIds]));
  }

  function activerAlertes() {
    apiPost("/api/v1/decideur/alertes/activer")
      .then((pref) => {
        setAlertesActivees(pref.activees);
        setBanniereVisible(false);
      })
      .catch((err) => setErreur(err.message));
  }

  function plusTard() {
    sessionStorage.setItem(CLE_BANNIERE_MASQUEE, "true");
    setBanniereVisible(false);
  }

  const nonLus = incidents.filter((i) => !idsLus.has(i.id)).length;

  return (
    <DecideurLayout>
      {erreur && <p style={{ color: "var(--color-ko)" }}>Erreur : {erreur}</p>}

      {!alertesActivees && banniereVisible && (
        <div className="alert-banner">
          <p style={{ fontWeight: 700 }}>Activer les alertes par email</p>
          <p>Recevez un email dès qu'une panne survient sur un site de votre ministère, même lorsque l'application est fermée.</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button className="btn-primary" onClick={activerAlertes}>Activer</button>
            <button className="btn-secondary" onClick={plusTard}>Plus tard</button>
          </div>
        </div>
      )}

      <div className="alertes-header-row">
        <div className="floors-title" style={{ marginBottom: 0 }}>
          Alertes récentes ({nonLus})
        </div>
        {incidents.length > 0 && (
          <button className="btn-link" onClick={toutMarquerLu}>Tout marquer lu</button>
        )}
      </div>

      {incidents.length === 0 && <p>Aucune alerte pour le moment.</p>}

      {/* .alerts-grid : liste empilee sur mobile, grille a 2/3 colonnes a
          partir de la tablette/desktop (voir index.css) - utile vu le
          volume potentiel d'incidents sur un reseau de cette taille. */}
      <div className="alerts-grid">
        {incidents.map((incident) => {
          const couleur = getStatusColor(incident.nouveauStatut);
          const lu = idsLus.has(incident.id);

          return (
            <div
              key={incident.id}
              className={`status-card alert-card ${lu ? "alert-card-lu" : ""}`}
              style={{ "--card-color": couleur }}
              onClick={() => marquerCommeLu(incident.id)}
            >
              <div className="card-top">
                <div className="card-icon" style={{ position: "relative" }}>
                  {incident.type === "ANPTIC" ? "🌐" : "🏢"}
                  {!lu && <span className="unread-dot"></span>}
                </div>
                <div className="card-titles">
                  <div className="card-title">{incident.siteNom}</div>
                  <div className="card-subtitle">{incident.ville}</div>
                </div>
                <span className={`status-badge ${badgeClass(incident.nouveauStatut)}`}>
                  {badgeLabel(incident.nouveauStatut)}
                </span>
              </div>

              <p className="alert-message">{incident.message}</p>

              <div className="alert-meta">
                <span className="alert-time">{formaterTempsRelatif(incident.survenuLe)}</span>
                <button
                  type="button"
                  className="alert-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    choisirSite(incident.siteId);
                  }}
                >
                  Voir le détail →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </DecideurLayout>
  );
}

export default AlertesPage;