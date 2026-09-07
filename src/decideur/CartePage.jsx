import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { apiGet } from "../shared/apiClient";
import { buildColoredMarkerIcon } from "../shared/mapMarkers";
import { getStatusLabel } from "../shared/statusStyles";
import { useSiteSelection } from "../shared/SiteSelectionContext";
import ErrorBanner from "../shared/ErrorBanner";
import DecideurLayout from "./DecideurLayout";

const CENTRE_BURKINA_FASO = [12.2, -1.5];
const INTERVALLE_ACTUALISATION_MS = 60000; // 60 s - payload plus lourd que "Mon site"

function badgeClassFor(statut) {
  if (statut === "KO") return "badge-ko";
  if (statut === "WARN") return "badge-warn";
  if (statut === "UNKNOWN") return "badge-unknown";
  return "badge-ok";
}

function CartePage() {
  const { choisirSite } = useSiteSelection();
  const [sites, setSites] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState("");

  function charger() {
    apiGet("/api/v1/sites/map").then(setSites).catch((err) => setErreur(err.message));
  }

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, INTERVALLE_ACTUALISATION_MS);
    return () => clearInterval(intervalle);
  }, []);

  const sitesAvecCoordonnees = useMemo(
    () => sites.filter((site) => site.latitude != null && site.longitude != null),
    [sites]
  );

  const sitesFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    if (!texte) return sitesAvecCoordonnees;
    return sitesAvecCoordonnees.filter(
      (site) =>
        site.nom.toLowerCase().includes(texte) || site.ville.toLowerCase().includes(texte)
    );
  }, [sitesAvecCoordonnees, recherche]);

  return (
    <DecideurLayout>
      <ErrorBanner message={erreur} onRetry={charger} />

      {/* Sur mobile/tablette : uniquement la carte, pleine largeur (comportement
          d'origine inchangé). A partir de 1024px, .map-layout devient un
          2-colonnes carte + liste (voir index.css). */}
      <div className="map-layout">
        <MapContainer center={CENTRE_BURKINA_FASO} zoom={7} className="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {sitesAvecCoordonnees.map((site) => (
            <Marker
              key={site.siteId}
              position={[site.latitude, site.longitude]}
              icon={buildColoredMarkerIcon(site.statutGlobal)}
            >
              <Popup>
                <strong>{site.nom}</strong>
                <br />
                {site.ville}
                <br />
                Statut : {getStatusLabel(site.statutGlobal)}
                <br />
                <button type="button" className="map-popup-link" onClick={() => choisirSite(site.siteId)}>
                  Voir ce site →
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Visible uniquement a partir de 1024px (voir .map-sidebar en CSS) */}
        <div className="map-sidebar">
          <div className="form-field" style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Rechercher un site…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          <div className="map-sidebar-count">
            {sitesFiltres.length} site{sitesFiltres.length > 1 ? "s" : ""}
          </div>

          <div className="map-sidebar-list">
            {sitesFiltres.map((site) => (
              <button
                type="button"
                key={site.siteId}
                onClick={() => choisirSite(site.siteId)}
                className="map-site-item"
              >
                <div>
                  <div className="map-site-item-name">{site.nom}</div>
                  <div className="map-site-item-ville">{site.ville}</div>
                </div>
                <span className={`status-badge ${badgeClassFor(site.statutGlobal)}`}>
                  {getStatusLabel(site.statutGlobal)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DecideurLayout>
  );
}

export default CartePage;