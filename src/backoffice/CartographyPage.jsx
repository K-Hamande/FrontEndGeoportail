import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import {
  Menu, Download, RefreshCw, MapPin, Check, TriangleAlert,
  MousePointerClick, X, Save, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { useOutletContext } from "react-router-dom";
import { adminGet, adminPut } from "../shared/backofficeApiClient";
import { buildColoredMarkerIcon } from "../shared/mapMarkers";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

const CENTRE_BURKINA_FASO = [12.2, -1.5];
const TAILLE_PAGE = 20;

// Composant interne : ecoute les clics sur la carte et transmet les
// coordonnees au parent via onPick - beaucoup plus intuitif que l'ancien
// LocationPicker qui necessitait un mode "edition" separe.
function ClickHandler({ onPick, actif }) {
  useMapEvents({
    click(e) {
      if (actif) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function clean(s) {
  return s ? s.trim().replace(/[\r\n]/g, "") : s;
}

function CartographyPage() {
  const { auth, setReduit, reduit } = useOutletContext();
  const { getAuthHeader } = useAuth();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [brouillon, setBrouillon] = useState({ latitude: null, longitude: null, infoAuSurvol: "" });
  const [modePositionnement, setModePositionnement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  // Filtres en cascade
  const [filtreRegion, setFiltreRegion] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("");
  const [filtreVille, setFiltreVille] = useState("");
  const [filtreMinistere, setFiltreMinistere] = useState("");
  const [filtreStatut, setFiltreStatut] = useState(""); // "positionne" | "non_positionne" | ""
  const [recherche, setRecherche] = useState("");
  const [pageCourante, setPageCourante] = useState(1);

  // Listes dependantes
  const [provinces, setProvinces] = useState([]);
  const [villes, setVilles] = useState([]);

  const nomAdmin = (auth?.username || "admin").split(".")[0].toUpperCase();
  const initiales = nomAdmin.substring(0, 2);

  async function charger() {
    try {
      const [cartData, statsData] = await Promise.all([
        adminGet("/backoffice/api/v1/cartography", getAuthHeader()),
        adminGet("/backoffice/api/v1/equipments/stats", getAuthHeader()),
      ]);
      setItems(cartData);
      setStats(statsData);
      setProvinces(statsData.provinces || []);
      setVilles(statsData.villes || []);
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => { charger(); }, []);

  useEffect(() => {
    const item = items.find((i) => i.siteId === siteId);
    if (item) {
      setBrouillon({ latitude: item.latitude, longitude: item.longitude, infoAuSurvol: item.infoAuSurvol ?? "" });
    }
    setSucces(null);
    setModePositionnement(false);
  }, [siteId, items]);

  async function onRegionChange(region) {
    setFiltreRegion(region);
    setFiltreProvince("");
    setFiltreVille("");
    setPageCourante(1);
    if (region) {
      const data = await adminGet(
        `/backoffice/api/v1/equipments/cascade?niveau=provinces&region=${encodeURIComponent(region)}`,
        getAuthHeader()
      ).catch(() => []);
      setProvinces(data);
      setVilles([]);
    } else {
      setProvinces(stats?.provinces || []);
      setVilles(stats?.villes || []);
    }
  }

  async function onProvinceChange(province) {
    setFiltreProvince(province);
    setFiltreVille("");
    setPageCourante(1);
    if (province) {
      const data = await adminGet(
        `/backoffice/api/v1/equipments/cascade?niveau=villes&province=${encodeURIComponent(province)}`,
        getAuthHeader()
      ).catch(() => []);
      setVilles(data);
    } else {
      setVilles(stats?.villes || []);
    }
  }

  async function enregistrer() {
    setErreur(null);
    setSucces(null);
    setEnregistrement(true);
    try {
      await adminPut(`/backoffice/api/v1/sites/${siteId}/cartography`, getAuthHeader(), {
        latitude: brouillon.latitude,
        longitude: brouillon.longitude,
        infoAuSurvol: brouillon.infoAuSurvol,
      });
      setSucces("Position enregistrée avec succès.");
      setModePositionnement(false);
      charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  function exporterGeoJson() {
    const geojson = {
      type: "FeatureCollection",
      features: items
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => ({
          type: "Feature",
          properties: { siteId: i.siteId, nom: i.nom, infoAuSurvol: i.infoAuSurvol },
          geometry: { type: "Point", coordinates: [i.longitude, i.latitude] },
        })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sites-resina.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filtrage de la liste
  const itemsFiltres = useMemo(() => {
    return items.filter((item) => {
      if (filtreRegion && item.regionAdministrative !== filtreRegion) return false;
      if (filtreProvince && item.province !== filtreProvince) return false;
      if (filtreVille && clean(item.ville) !== clean(filtreVille)) return false;
      if (filtreMinistere && item.ministere !== filtreMinistere) return false;
      if (filtreStatut === "positionne" && !item.positionne) return false;
      if (filtreStatut === "non_positionne" && item.positionne) return false;
      if (recherche) {
        const t = recherche.trim().toLowerCase();
        return item.nom.toLowerCase().includes(t) || (item.ville || "").toLowerCase().includes(t);
      }
      return true;
    });
  }, [items, filtreRegion, filtreProvince, filtreVille, filtreMinistere, filtreStatut, recherche]);

  // Stats positionnement
  const nbPositionnes = items.filter((i) => i.positionne).length;
  const nbTotal = items.length;
  const pctPositionnes = nbTotal > 0 ? ((nbPositionnes / nbTotal) * 100).toFixed(1) : "0";

  // Pagination liste
  const totalPages = Math.max(1, Math.ceil(itemsFiltres.length / TAILLE_PAGE));
  const pageActuelle = Math.min(pageCourante, totalPages);
  const debut = (pageActuelle - 1) * TAILLE_PAGE;
  const itemsPage = itemsFiltres.slice(debut, debut + TAILLE_PAGE);

  const siteSelectionne = items.find((i) => i.siteId === siteId);
  const centreCarte = brouillon.latitude != null && brouillon.longitude != null
    ? [brouillon.latitude, brouillon.longitude]
    : CENTRE_BURKINA_FASO;

  const aDesFiltres = filtreRegion || filtreProvince || filtreVille || filtreMinistere || filtreStatut || recherche;

  return (
    <>
      <div className="dashboard-topbar">
        <button className="topbar-collapse-btn" onClick={() => setReduit(!reduit)}><Menu size={18} /></button>
        <div className="topbar-titles">
          <h1 className="topbar-title-welcome">Cartographie</h1>
          <p className="topbar-subtitle">
            {nbPositionnes} / {nbTotal} sites positionnés ({pctPositionnes}%)
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn-outline" onClick={exporterGeoJson}
            style={{ padding: "8px 14px", borderRadius: "10px", fontSize: "12px" }}>
            <Download size={13} /> Exporter GeoJSON
          </button>
          <button className="topbar-refresh" onClick={charger}><RefreshCw size={13} /> Actualiser</button>
          <div className="topbar-user">
            <div className="topbar-user-avatar">{initiales}</div>
            <div className="topbar-user-info">
              <div className="topbar-user-name">Admin {nomAdmin}</div>
              <div className="topbar-user-role">Super Administrateur</div>
            </div>
          </div>
        </div>
      </div>

      <div className="backoffice-content dashboard-content">
        <ErrorBanner message={erreur} onRetry={charger} />
        {succes && <p style={{ color: "var(--bo-ok)" }}>{succes}</p>}

        {/* Barre de progression positionnement */}
        <div className="carto-progress-panel">
          <div className="carto-progress-header">
            <span><MapPin size={14} style={{ verticalAlign: "-2px" }} /> Progression du positionnement GPS</span>
            <span className="carto-progress-count"><strong>{nbPositionnes}</strong> / {nbTotal} sites</span>
          </div>
          <div className="carto-progress-bar">
            <div className="carto-progress-fill" style={{ width: `${pctPositionnes}%` }}></div>
          </div>
          <div className="carto-progress-labels">
            <span style={{ color: "var(--bo-ok)", display: "inline-flex", alignItems: "center", gap: "4px" }}><Check size={13} /> {nbPositionnes} positionnés</span>
            <span style={{ color: "var(--bo-warn)", display: "inline-flex", alignItems: "center", gap: "4px" }}><TriangleAlert size={13} /> {nbTotal - nbPositionnes} à positionner</span>
          </div>
        </div>

        {/* Layout 2 colonnes : carte + liste */}
        <div className="carto-layout">

          {/* COLONNE GAUCHE : carte */}
          <div className="carto-map-col">
            <div className="carto-map-header">
              {modePositionnement ? (
                <div className="carto-mode-actif">
                  <MousePointerClick size={14} style={{ verticalAlign: "-2px" }} /> Cliquez sur la carte pour positionner <strong>{siteSelectionne?.nom}</strong>
                  <button className="btn-outline" style={{ marginLeft: "12px", fontSize: "11px" }}
                    onClick={() => setModePositionnement(false)}>Annuler</button>
                </div>
              ) : (
                <span style={{ fontSize: "12px", color: "var(--bo-ink-muted)" }}>
                  {siteSelectionne ? `Site sélectionné : ${siteSelectionne.nom}` : "Sélectionnez un site dans la liste"}
                </span>
              )}
            </div>

            <MapContainer
              center={centreCarte}
              zoom={brouillon.latitude != null ? 11 : 7}
              className="carto-map"
              key={siteId}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler actif={modePositionnement}
                onPick={(lat, lng) => setBrouillon((prev) => ({ ...prev, latitude: lat, longitude: lng }))} />

              {/* Uniquement les sites filtres ET positionnés, sauf le site selectionne */}
              {itemsFiltres
                .filter((i) => i.latitude != null && i.longitude != null && i.siteId !== siteId)
                .map((i) => (
                  <Marker key={i.siteId} position={[i.latitude, i.longitude]}
                    icon={buildColoredMarkerIcon("UNKNOWN")}
                    eventHandlers={{ click: () => setSiteId(i.siteId) }}>
                    <Popup><strong>{i.nom}</strong><br />{i.ville}</Popup>
                  </Marker>
                ))}

              {/* Site selectionne (vert) */}
              {brouillon.latitude != null && brouillon.longitude != null && (
                <Marker position={[brouillon.latitude, brouillon.longitude]}
                  icon={buildColoredMarkerIcon("OK")}>
                  <Popup><strong>{siteSelectionne?.nom}</strong></Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Panneau de positionnement */}
            {siteSelectionne && (
              <div className="carto-position-panel">
                <div className="carto-position-header">
                  <h3>{siteSelectionne.nom}</h3>
                  <span className={`status-pill ${siteSelectionne.positionne ? "pill-ok" : "pill-warn"}`}>
                    {siteSelectionne.positionne ? <><Check size={12} /> Positionné</> : <><TriangleAlert size={12} /> À positionner</>}
                  </span>
                </div>

                <div className="carto-coords">
                  <div className="carto-coord-box">
                    <div className="carto-coord-label">Latitude</div>
                    <div className="carto-coord-value">{brouillon.latitude?.toFixed(6) ?? "—"}</div>
                  </div>
                  <div className="carto-coord-box">
                    <div className="carto-coord-label">Longitude</div>
                    <div className="carto-coord-value">{brouillon.longitude?.toFixed(6) ?? "—"}</div>
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: "10px" }}>
                  <label className="cascade-label">Info affichée au survol</label>
                  <input value={brouillon.infoAuSurvol}
                    onChange={(e) => setBrouillon((prev) => ({ ...prev, infoAuSurvol: e.target.value }))}
                    placeholder="ex: Hub central RESINA" />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="topbar-refresh"
                    onClick={() => setModePositionnement(!modePositionnement)}
                    style={{ fontSize: "12px", flex: 1 }}>
                    {modePositionnement ? <><X size={13} /> Annuler le clic</> : <><MapPin size={13} /> Cliquer sur la carte</>}
                  </button>
                  <button className="btn-primary"
                    disabled={enregistrement || brouillon.latitude == null}
                    onClick={enregistrer}
                    style={{ fontSize: "12px", flex: 1, padding: "8px", borderRadius: "10px" }}>
                    {enregistrement ? "Enregistrement…" : <><Save size={13} /> Enregistrer</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : filtres + liste */}
          <div className="carto-list-col">
            {/* Filtres */}
            <div className="carto-filters">
              <input className="attention-search" style={{ width: "100%", marginBottom: "8px" }}
                placeholder="Rechercher un site…" value={recherche}
                onChange={(e) => { setRecherche(e.target.value); setPageCourante(1); }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px", marginBottom: "8px" }}>
                <div className="cascade-group">
                  <label className="cascade-label">Région</label>
                  <SearchableSelect selectClassName="attention-search" value={filtreRegion}
                    onChange={(e) => onRegionChange(e.target.value)}>
                    <option value="">Toutes</option>
                    {stats?.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </SearchableSelect>
                </div>
                <div className="cascade-group">
                  <label className="cascade-label">Province</label>
                  <SearchableSelect selectClassName="attention-search" value={filtreProvince}
                    onChange={(e) => onProvinceChange(e.target.value)}>
                    <option value="">Toutes</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </SearchableSelect>
                </div>
                <div className="cascade-group">
                  <label className="cascade-label">Ville</label>
                  <SearchableSelect selectClassName="attention-search" value={filtreVille}
                    onChange={(e) => { setFiltreVille(e.target.value); setPageCourante(1); }}>
                    <option value="">Toutes</option>
                    {villes.map((v) => <option key={v} value={clean(v)}>{clean(v)}</option>)}
                  </SearchableSelect>
                </div>
                <div className="cascade-group">
                  <label className="cascade-label">Ministère</label>
                  <SearchableSelect selectClassName="attention-search" value={filtreMinistere}
                    onChange={(e) => { setFiltreMinistere(e.target.value); setPageCourante(1); }}>
                    <option value="">Tous</option>
                    {stats?.ministeres.map((m) => <option key={m} value={m}>{m}</option>)}
                  </SearchableSelect>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                {["", "positionne", "non_positionne"].map((v) => (
                  <button key={v}
                    className={`pagination-btn ${filtreStatut === v ? "pagination-btn-active" : ""}`}
                    style={{ flex: 1, fontSize: "11px" }}
                    onClick={() => { setFiltreStatut(v); setPageCourante(1); }}>
                    {v === "" ? "Tous" : v === "positionne" ? <><Check size={11} /> Positionnés</> : <><TriangleAlert size={11} /> À faire</>}
                  </button>
                ))}
              </div>

              {aDesFiltres && (
                <button className="btn-outline" style={{ width: "100%", fontSize: "11px" }}
                  onClick={() => {
                    setFiltreRegion(""); setFiltreProvince(""); setFiltreVille("");
                    setFiltreMinistere(""); setFiltreStatut(""); setRecherche("");
                    setProvinces(stats?.provinces || []); setVilles(stats?.villes || []);
                    setPageCourante(1);
                  }}><X size={12} /> Effacer les filtres</button>
              )}

              <div className="map-sidebar-count" style={{ marginTop: "6px" }}>
                {itemsFiltres.length} site{itemsFiltres.length > 1 ? "s" : ""}
              </div>
            </div>

            {/* Liste */}
            <div className="carto-site-list">
              {itemsPage.map((item) => (
                <button key={item.siteId} type="button"
                  className="carto-site-item"
                  style={{ background: item.siteId === siteId ? "var(--bo-primary-soft)" : "transparent" }}
                  onClick={() => setSiteId(item.siteId)}>
                  <div>
                    <div className="carto-site-nom">{item.nom}</div>
                    <div className="carto-site-ville">{clean(item.ville)}</div>
                  </div>
                  <span className={`status-pill ${item.positionne ? "pill-ok" : "pill-warn"}`}
                    style={{ fontSize: "10px", padding: "2px 8px" }}>
                    {item.positionne ? <Check size={11} /> : <TriangleAlert size={11} />}
                  </span>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar" style={{ padding: "8px 4px" }}>
                <button className="pagination-btn" onClick={() => setPageCourante(pageActuelle - 1)}
                  disabled={pageActuelle === 1}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: "11px", color: "var(--bo-ink-muted)" }}>
                  {pageActuelle} / {totalPages}
                </span>
                <button className="pagination-btn" onClick={() => setPageCourante(pageActuelle + 1)}
                  disabled={pageActuelle === totalPages}><ChevronRight size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CartographyPage;