import { useEffect, useState } from "react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPost, adminPut } from "../shared/backofficeApiClient";
import { useOutletContext } from "react-router-dom";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

const TYPE_LABELS = {
  BORNE_WIFI: "Borne Wi-Fi", COMMUTATEUR: "Commutateur (Switch)",
  ROUTEUR: "Routeur", PTP: "Point-to-Point (PTP)",
  PMP: "Point-to-Multipoint (PMP)", CPE: "CPE (Terminaison opérateur)",
  ONDULEUR: "Onduleur (UPS)", SERVEUR: "Serveur",
  PYLONE: "Pylône / Tour", AUTRE: "Autre",
};

const TYPE_ICONS = {
  BORNE_WIFI: "📡", COMMUTATEUR: "🔀", ROUTEUR: "🌐",
  PTP: "↔️", PMP: "📶", CPE: "🔌",
  ONDULEUR: "🔋", SERVEUR: "🖥️", PYLONE: "🗼", AUTRE: "⚙️",
};

const TYPE_COLORS = {
  BORNE_WIFI: "#0D9B5A", COMMUTATEUR: "#0A3D7A", ROUTEUR: "#4A9EFF",
  PTP: "#C97C0A", PMP: "#9B5AE0", CPE: "#D93535",
  ONDULEUR: "#E05A9B", SERVEUR: "#5A9BE0", PYLONE: "#5AE09B", AUTRE: "#6B7280",
};

const TAILLE_PAGE = 25;

function clean(s) {
  return s ? s.trim().replace(/[\r\n]/g, "") : s;
}

function EquipmentsPage() {
  const { auth, setReduit, reduit } = useOutletContext();
  const { getAuthHeader } = useAuth();

  const [stats, setStats] = useState(null);
  const [equipements, setEquipements] = useState([]);

  // Filtres en cascade
  const [filtreRegion, setFiltreRegion] = useState("");
  const [filtreProvince, setFiltreProvince] = useState("");
  const [filtreVille, setFiltreVille] = useState("");
  const [filtreMinistere, setFiltreMinistere] = useState("");
  const [filtreStructure, setFiltreStructure] = useState("");
  const [filtreType, setFiltreType] = useState("");

  // Listes dependantes (se rechargent selon les selections)
  const [provinces, setProvinces] = useState([]);
  const [villes, setVilles] = useState([]);
  const [structures, setStructures] = useState([]);

  const [pageCourante, setPageCourante] = useState(1);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [chargementEq, setChargementEq] = useState(false);
  const [synchronisation, setSynchronisation] = useState(false);
  const [messageSync, setMessageSync] = useState(null);
  const [brouillons, setBrouillons] = useState({});

  const nomAdmin = (auth?.username || "admin").split(".")[0].toUpperCase();
  const initiales = nomAdmin.substring(0, 2);

  // Chargement initial (et post-synchronisation) : recupere aussi les
  // listes completes region/province/ville/ministere/structure qui
  // alimentent les selects de filtre.
  async function chargerStats() {
    try {
      const data = await adminGet("/backoffice/api/v1/equipments/stats", getAuthHeader());
      setStats(data);
      setProvinces(data.provinces || []);
      setVilles(data.villes || []);
      setStructures(data.structures || []);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  // Recalcule uniquement "Repartition par type d'equipement" (total +
  // parType) selon les filtres geographiques/organisationnels actifs -
  // sans toucher aux listes region/province/ville/ministere/structure
  // (qui restent gerees par la cascade region->province->ville et
  // ministere->structure) pour ne pas les ecraser.
  async function rechargerRepartition() {
    try {
      const params = new URLSearchParams();
      if (filtreRegion) params.append("region", filtreRegion);
      if (filtreProvince) params.append("province", filtreProvince);
      if (filtreVille) params.append("ville", filtreVille);
      if (filtreMinistere) params.append("ministere", filtreMinistere);
      if (filtreStructure) params.append("structure", filtreStructure);

      const data = await adminGet("/backoffice/api/v1/equipments/stats?" + params.toString(), getAuthHeader());
      setStats((prev) => (prev ? { ...prev, total: data.total, totalGlobal: data.totalGlobal, parType: data.parType } : data));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function chargerEquipements() {
    setChargementEq(true);
    try {
      const params = new URLSearchParams();
      if (filtreRegion) params.append("region", filtreRegion);
      if (filtreProvince) params.append("province", filtreProvince);
      if (filtreVille) params.append("ville", filtreVille);
      if (filtreMinistere) params.append("ministere", filtreMinistere);
      if (filtreStructure) params.append("structure", filtreStructure);
      if (filtreType) params.append("type", filtreType);

      const data = await adminGet("/backoffice/api/v1/equipments?" + params.toString(), getAuthHeader());
      setEquipements(data);
      setPageCourante(1);
      setBrouillons(Object.fromEntries(
        data.map((eq) => [eq.id, { etageLabel: eq.etageLabel ?? "", libelleAffiche: eq.libelleAffiche ?? "" }])
      ));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargementEq(false);
    }
  }

  // Cascade region -> provinces
  async function onRegionChange(region) {
    setFiltreRegion(region);
    setFiltreProvince("");
    setFiltreVille("");
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

  // Cascade province -> villes
  async function onProvinceChange(province) {
    setFiltreProvince(province);
    setFiltreVille("");
    if (province) {
      const data = await adminGet(
        `/backoffice/api/v1/equipments/cascade?niveau=villes&province=${encodeURIComponent(province)}`,
        getAuthHeader()
      ).catch(() => []);
      setVilles(data);
    } else {
      setVilles(filtreRegion ? provinces : (stats?.villes || []));
    }
  }

  // Cascade ministere -> structures
  async function onMinistereChange(ministere) {
    setFiltreMinistere(ministere);
    setFiltreStructure("");
    if (ministere) {
      const data = await adminGet(
        `/backoffice/api/v1/equipments/cascade?niveau=structures&ministere=${encodeURIComponent(ministere)}`,
        getAuthHeader()
      ).catch(() => []);
      setStructures(data);
    } else {
      setStructures(stats?.structures || []);
    }
  }

  useEffect(() => { chargerStats(); }, []);

  useEffect(() => {
    chargerEquipements();
  }, [filtreRegion, filtreProvince, filtreVille, filtreMinistere, filtreStructure, filtreType]);

  // La repartition par type ne depend pas du filtre "type" lui-meme
  // (chaque carte doit rester visible pour pouvoir en choisir une autre),
  // seulement des filtres geographiques/organisationnels.
  useEffect(() => {
    if (chargement) return; // evite un appel redondant avant le chargement initial
    rechargerRepartition();
  }, [filtreRegion, filtreProvince, filtreVille, filtreMinistere, filtreStructure]);

  async function synchroniser() {
    setSynchronisation(true);
    setMessageSync(null);
    setErreur(null);
    try {
      const res = await adminPost("/backoffice/api/v1/equipments/sync-netxms", getAuthHeader());
      setMessageSync(`Synchronisation terminée : ${res.crees} créé(s), ${res.misAJour} mis à jour, ${res.ignores} ignoré(s).`);
      chargerStats();
      chargerEquipements();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSynchronisation(false);
    }
  }

  async function enregistrer(equipmentId) {
    try {
      await adminPut(`/backoffice/api/v1/equipments/${equipmentId}/etage`, getAuthHeader(), {
        etageLabel: brouillons[equipmentId]?.etageLabel || null,
        libelleAffiche: brouillons[equipmentId]?.libelleAffiche || null,
      });
      chargerEquipements();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function modifierBrouillon(id, champ, valeur) {
    setBrouillons((prev) => ({ ...prev, [id]: { ...prev[id], [champ]: valeur } }));
  }

  function aChange(eq) {
    const b = brouillons[eq.id];
    if (!b) return false;
    return b.etageLabel !== (eq.etageLabel ?? "") || b.libelleAffiche !== (eq.libelleAffiche ?? "");
  }

  function effacerFiltres() {
    setFiltreRegion(""); setFiltreProvince(""); setFiltreVille("");
    setFiltreMinistere(""); setFiltreStructure(""); setFiltreType("");
    setProvinces(stats?.provinces || []);
    setVilles(stats?.villes || []);
    setStructures(stats?.structures || []);
  }

  const aDesFiltres = filtreRegion || filtreProvince || filtreVille || filtreMinistere || filtreStructure || filtreType;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(equipements.length / TAILLE_PAGE));
  const pageActuelle = Math.min(pageCourante, totalPages);
  const debut = (pageActuelle - 1) * TAILLE_PAGE;
  const equipementsPage = equipements.slice(debut, debut + TAILLE_PAGE);

  function numerosPagesAffiches() {
    const pages = [];
    const rayon = 2;
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
        <button className="topbar-collapse-btn" onClick={() => setReduit(!reduit)}>☰</button>
        <div className="topbar-titles">
          <h1 className="topbar-title-welcome">Équipements réseau</h1>
          <p className="topbar-subtitle">{stats?.totalGlobal ?? "..."} équipements synchronisés sur {stats?.regions?.length ?? 0} régions</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-primary" disabled={synchronisation} onClick={synchroniser}
            style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "12px" }}>
            {synchronisation ? "Synchronisation…" : "⟳ Synchroniser NetXMS"}
          </button>
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
        <ErrorBanner message={erreur} onRetry={chargerStats} />
        {messageSync && <p style={{ color: "var(--bo-ok)" }}>{messageSync}</p>}

        {/* Stats par type */}
        {!chargement && stats && (
          <div className="eq-stats-section">
            <h2 className="eq-stats-title">Répartition par type d'équipement</h2>
            <div className="eq-stats-grid">
              {stats.parType.map((s) => (
                <div key={s.type} className="eq-stat-card"
                  onClick={() => setFiltreType(filtreType === s.type ? "" : s.type)}
                  style={{
                    borderTop: `3px solid ${TYPE_COLORS[s.type] || "#6B7280"}`,
                    cursor: "pointer",
                    background: filtreType === s.type ? "#F0F4FB" : "white",
                  }}>
                  <div className="eq-stat-icon">{TYPE_ICONS[s.type] || "⚙️"}</div>
                  <div style={{ flex: 1 }}>
                    <div className="eq-stat-label">{s.libelle}</div>
                    <div className="eq-stat-value">{s.count.toLocaleString("fr-FR")}</div>
                    <div className="eq-stat-bar">
                      <div className="eq-stat-bar-fill"
                        style={{ width: `${s.pourcentage}%`, background: TYPE_COLORS[s.type] || "#6B7280" }}></div>
                    </div>
                    <div className="eq-stat-pct">{s.pourcentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtres en cascade */}
        <div className="panel">
          <div className="panel-header" style={{ flexWrap: "wrap", gap: "8px" }}>
            <h2>🔌 Équipements <span className="attention-count" style={{ background: "var(--bo-primary)" }}>{equipements.length}</span></h2>
            <div className="panel-header-actions" style={{ flexWrap: "wrap", gap: "8px" }}>

              {/* Cascade géographique */}
              <div className="cascade-group">
                <label className="cascade-label">Région</label>
                <SearchableSelect selectClassName="attention-search" value={filtreRegion} onChange={(e) => onRegionChange(e.target.value)}>
                  <option value="">Toutes les régions</option>
                  {stats?.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Province</label>
                <SearchableSelect selectClassName="attention-search" value={filtreProvince}
                  onChange={(e) => onProvinceChange(e.target.value)} disabled={!filtreRegion && provinces.length === 0}>
                  <option value="">Toutes les provinces</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Ville</label>
                <SearchableSelect selectClassName="attention-search" value={filtreVille} onChange={(e) => setFiltreVille(e.target.value)}>
                  <option value="">Toutes les villes</option>
                  {villes.map((v) => <option key={v} value={clean(v)}>{clean(v)}</option>)}
                </SearchableSelect>
              </div>

              {/* Cascade ministère */}
              <div className="cascade-group">
                <label className="cascade-label">Ministère</label>
                <SearchableSelect selectClassName="attention-search" value={filtreMinistere} onChange={(e) => onMinistereChange(e.target.value)}>
                  <option value="">Tous les ministères</option>
                  {stats?.ministeres.map((m) => <option key={m} value={m}>{m}</option>)}
                </SearchableSelect>
              </div>

              <div className="cascade-group">
                <label className="cascade-label">Structure</label>
                <SearchableSelect selectClassName="attention-search" value={filtreStructure} onChange={(e) => setFiltreStructure(e.target.value)}>
                  <option value="">Toutes les structures</option>
                  {structures.map((s) => <option key={s} value={s}>{s}</option>)}
                </SearchableSelect>
              </div>

              {/* Type */}
              <div className="cascade-group">
                <label className="cascade-label">Type</label>
                <SearchableSelect selectClassName="attention-search" value={filtreType} onChange={(e) => setFiltreType(e.target.value)}>
                  <option value="">Tous les types</option>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SearchableSelect>
              </div>

              {aDesFiltres && (
                <button className="btn-outline" onClick={effacerFiltres}
                  style={{ alignSelf: "flex-end" }}>✕ Effacer</button>
              )}
            </div>
          </div>

          {chargementEq && <p>Chargement...</p>}

          {!chargementEq && equipementsPage.length > 0 && (
            <>
              <table className="admin-table attention-table">
                <thead>
                  <tr>
                    <th>TYPE</th>
                    <th>NOM TECHNIQUE</th>
                    <th>LIBELLÉ AFFICHÉ</th>
                    <th>ÉTAGE</th>
                    <th>SITE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {equipementsPage.map((eq) => (
                    <tr key={eq.id}>
                      <td>
                        <span className="eq-type-badge"
                          style={{ background: (TYPE_COLORS[eq.type] || "#6B7280") + "20", color: TYPE_COLORS[eq.type] || "#6B7280" }}>
                          {TYPE_ICONS[eq.type] || "⚙️"} {TYPE_LABELS[eq.type] || eq.type}
                        </span>
                      </td>
                      <td className="alerte-cell">{eq.nomTechniqueNetxms}</td>
                      <td>
                        <input type="text" value={brouillons[eq.id]?.libelleAffiche ?? ""}
                          placeholder="Libellé décideur…"
                          onChange={(e) => modifierBrouillon(eq.id, "libelleAffiche", e.target.value)}
                          style={{ width: "160px", padding: "4px 8px", border: "1px solid var(--bo-border)", borderRadius: "6px", fontSize: "12px" }} />
                      </td>
                      <td>
                        <input type="text" value={brouillons[eq.id]?.etageLabel ?? ""}
                          placeholder="Non assigné"
                          onChange={(e) => modifierBrouillon(eq.id, "etageLabel", e.target.value)}
                          style={{ width: "100px", padding: "4px 8px", border: "1px solid var(--bo-border)", borderRadius: "6px", fontSize: "12px" }} />
                      </td>
                      <td className="alerte-cell">{eq.siteId}</td>
                      <td>
                        <button className="btn-voir" disabled={!aChange(eq)} onClick={() => enregistrer(eq.id)}>
                          💾 Enregistrer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination-bar">
                <div className="pagination-info">
                  Affichage de <strong>{debut + 1}</strong> à <strong>{Math.min(debut + TAILLE_PAGE, equipements.length)}</strong> sur <strong>{equipements.length}</strong>
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setPageCourante(pageActuelle - 1)} disabled={pageActuelle === 1}>← Précédent</button>
                  {numerosPagesAffiches().map((n, idx) =>
                    n === "..." ? (
                      <span key={`e${idx}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button key={n} className={`pagination-btn ${n === pageActuelle ? "pagination-btn-active" : ""}`}
                        onClick={() => setPageCourante(n)}>{n}</button>
                    )
                  )}
                  <button className="pagination-btn" onClick={() => setPageCourante(pageActuelle + 1)} disabled={pageActuelle === totalPages}>Suivant →</button>
                </div>
              </div>
            </>
          )}

          {!chargementEq && equipements.length === 0 && (
            <p>Aucun équipement pour ces filtres.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default EquipmentsPage;