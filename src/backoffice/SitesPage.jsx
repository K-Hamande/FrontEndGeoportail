import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Menu, Building2, X, Pencil, RefreshCw, Pause, Play, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost } from "../shared/backofficeApiClient";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

const TAILLE_PAGE = 20;

function SitesPage() {
  const { auth, setReduit, reduit } = useOutletContext();
  const { getAuthHeader } = useAuth();
  const [sites, setSites] = useState([]);
  const [filtreNom, setFiltreNom] = useState("");
  const [filtreRegion, setFiltreRegion] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("");
  const [filtreVille, setFiltreVille] = useState("");
  const [filtreMinistere, setFiltreMinistere] = useState("");
  const [pageCourante, setPageCourante] = useState(1);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [derniereMaj, setDerniereMaj] = useState(new Date());

  function charger() {
    setChargement(true);
    adminGet("/backoffice/api/v1/sites", getAuthHeader())
      .then((data) => {
        setSites(data);
        setDerniereMaj(new Date());
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  // Retour a la page 1 quand un filtre change (sinon on peut se
  // retrouver sur une page vide si les resultats filtrés sont peu nombreux)
  useEffect(() => {
    setPageCourante(1);
  }, [filtreNom, filtreRegion, filtreProvince, filtreVille, filtreMinistere]);

  async function toggleActive(site) {
    const action = site.actif ? "deactivate" : "activate";
    try {
      await adminPost(`/backoffice/api/v1/sites/${site.siteId}/${action}`, getAuthHeader());
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  // Listes d'options pour les filtres region/province/ville/ministere,
  // calculees directement a partir des sites deja charges (pas d'appel
  // reseau supplementaire, la liste complete des sites est deja en
  // memoire). Chaque niveau geographique se restreint selon les filtres
  // deja actifs au-dessus de lui - meme principe de cascade que sur les
  // pages Equipements et Cartographie (region -> province -> ville).
  const regions = [...new Set(sites.map((s) => s.regionAdministrative).filter(Boolean))].sort();
  const provinces = [...new Set(
    sites
      .filter((s) => !filtreRegion || s.regionAdministrative === filtreRegion)
      .map((s) => s.province)
      .filter(Boolean)
  )].sort();
  const villes = [...new Set(
    sites
      .filter((s) =>
        (!filtreRegion || s.regionAdministrative === filtreRegion) &&
        (!filtreProvince || s.province === filtreProvince)
      )
      .map((s) => s.ville)
      .filter(Boolean)
  )].sort();
  const ministeres = [...new Set(sites.map((s) => s.ministere).filter(Boolean))].sort();

  function onRegionChange(region) {
    setFiltreRegion(region);
    setFiltreProvince("");
    setFiltreVille("");
  }

  function onProvinceChange(province) {
    setFiltreProvince(province);
    setFiltreVille("");
  }

  function effacerFiltres() {
    setFiltreNom("");
    setFiltreRegion("");
    setFiltreProvince("");
    setFiltreVille("");
    setFiltreMinistere("");
  }

  const aDesFiltres = filtreNom || filtreRegion || filtreProvince || filtreVille || filtreMinistere;

  const sitesFiltres = sites.filter((site) => {
    if (filtreNom && !site.nom.toLowerCase().includes(filtreNom.toLowerCase())) return false;
    if (filtreRegion && site.regionAdministrative !== filtreRegion) return false;
    if (filtreProvince && site.province !== filtreProvince) return false;
    if (filtreVille && site.ville !== filtreVille) return false;
    if (filtreMinistere && site.ministere !== filtreMinistere) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(sitesFiltres.length / TAILLE_PAGE));
  const pageActuelle = Math.min(pageCourante, totalPages);
  const debut = (pageActuelle - 1) * TAILLE_PAGE;
  const fin = debut + TAILLE_PAGE;
  const sitesPage = sitesFiltres.slice(debut, fin);

  const nomAdmin = (auth?.username || "admin").split(".")[0].toUpperCase();
  const initiales = nomAdmin.substring(0, 2);
  const heureMaj = derniereMaj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Fabrique la liste des numeros de page a afficher, avec des "..." pour
  // les grands sauts, style : 1 ... 4 5 [6] 7 8 ... 82
  function numerosPagesAffiches() {
    const pages = [];
    const rayon = 2; // combien de pages on montre de chaque cote de la page courante
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= pageActuelle - rayon && i <= pageActuelle + rayon)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }

  return (
    <>
      <div className="dashboard-topbar">
        <button className="topbar-collapse-btn" onClick={() => setReduit(!reduit)} aria-label="Basculer la barre latérale"><Menu size={18} /></button>
        <div className="topbar-titles">
          <h1 className="topbar-title-welcome">Gestion des sites</h1>
          <p className="topbar-subtitle">{sites.length} sites configurés sur le réseau RESINA</p>
        </div>
        <div className="topbar-actions">
          <div className="topbar-live-badge-compact">
            <span className="live-dot"></span>
            <div>
              <div className="topbar-live-label">EN DIRECT</div>
              <div className="topbar-live-sub">Données actualisées à {heureMaj}</div>
            </div>
          </div>
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

        <div className="panel attention-panel">
          <div className="panel-header" style={{ flexWrap: "wrap", gap: "8px" }}>
            <h2><Building2 size={16} className="panel-title-icon" /> Sites configurés <span className="attention-count" style={{ background: "var(--bo-primary)" }}>{sitesFiltres.length}</span></h2>
            <div className="panel-header-actions" style={{ flexWrap: "wrap", gap: "8px" }}>
              <input
                className="attention-search"
                placeholder="Rechercher un site…"
                value={filtreNom}
                onChange={(e) => setFiltreNom(e.target.value)}
              />

              <div className="cascade-group">
                <label className="cascade-label">Région</label>
                <SearchableSelect selectClassName="attention-search" value={filtreRegion} onChange={(e) => onRegionChange(e.target.value)}>
                  <option value="">Toutes les régions</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Province</label>
                <SearchableSelect selectClassName="attention-search" value={filtreProvince} onChange={(e) => onProvinceChange(e.target.value)}>
                  <option value="">Toutes les provinces</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Ville</label>
                <SearchableSelect selectClassName="attention-search" value={filtreVille} onChange={(e) => setFiltreVille(e.target.value)}>
                  <option value="">Toutes les villes</option>
                  {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Ministère</label>
                <SearchableSelect selectClassName="attention-search" value={filtreMinistere} onChange={(e) => setFiltreMinistere(e.target.value)}>
                  <option value="">Tous les ministères</option>
                  {ministeres.map((m) => <option key={m} value={m}>{m}</option>)}
                </SearchableSelect>
              </div>

              {aDesFiltres && (
                <button className="btn-outline" onClick={effacerFiltres}><X size={13} /> Effacer les filtres</button>
              )}

              <Link to="/backoffice/sites/new" className="topbar-refresh" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                + Nouveau site
              </Link>
            </div>
          </div>

          {chargement && <p>Chargement...</p>}

          {!chargement && sitesPage.length > 0 && (
            <>
              <table className="admin-table attention-table">
                <thead>
                  <tr>
                    <th>SITE</th>
                    <th>LOCALISATION</th>
                    <th>MINISTÈRE</th>
                    <th>NŒUD NETXMS</th>
                    <th>ÉQUIPEMENTS</th>
                    <th>STATUT</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {sitesPage.map((site) => (
                    <tr key={site.siteId}>
                      <td><div className="site-name-cell"><Building2 size={13} /> {site.nom}</div></td>
                      <td>
                        <div>{site.ville}</div>
                        <div className="site-location-cell">
                          {[site.province, site.regionAdministrative].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        <span title={site.ministere || ""} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {site.ministere || "—"}
                        </span>
                      </td>
                      <td className="alerte-cell">{site.netxmsNodeId ?? "—"}</td>
                      <td>{site.nombreEquipements ?? 0}</td>
                      <td>
                        <span className={`status-pill ${site.actif ? "pill-ok" : "pill-ko"}`}>
                          <Circle size={8} fill="currentColor" stroke="none" /> {site.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
                          <Link to={`/backoffice/sites/${site.siteId}/edit`} className="btn-voir" style={{ whiteSpace: "nowrap", flexShrink: 0 }}><Pencil size={13} /> Modifier</Link>
                          <button className="btn-voir" style={{ whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => toggleActive(site)}>
                            {site.actif ? <><Pause size={13} /> Désactiver</> : <><Play size={13} /> Activer</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination-bar">
                <div className="pagination-info">
                  Affichage de <strong>{debut + 1}</strong> à <strong>{Math.min(fin, sitesFiltres.length)}</strong> sur <strong>{sitesFiltres.length}</strong> site(s)
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setPageCourante(pageActuelle - 1)}
                    disabled={pageActuelle === 1}
                  >
                    <ChevronLeft size={13} /> Précédent
                  </button>
                  {numerosPagesAffiches().map((n, idx) =>
                    n === "..." ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={n}
                        className={`pagination-btn ${n === pageActuelle ? "pagination-btn-active" : ""}`}
                        onClick={() => setPageCourante(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    className="pagination-btn"
                    onClick={() => setPageCourante(pageActuelle + 1)}
                    disabled={pageActuelle === totalPages}
                  >
                    Suivant <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

          {!chargement && sitesFiltres.length === 0 && (
            <p>Aucun site trouvé pour ces filtres.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default SitesPage;