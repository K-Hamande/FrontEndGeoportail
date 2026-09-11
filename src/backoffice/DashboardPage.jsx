import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import {
  Menu, Sparkle, Bell, Building2, Check, TriangleAlert, X, Plug,
  Activity, Download, RefreshCw, Eye, Trophy, ThumbsUp, Siren, Circle,
} from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { adminGet } from "../shared/backofficeApiClient";
import ErrorBanner from "../shared/ErrorBanner";

function DashboardPage() {
  const { auth, setReduit, reduit } = useOutletContext();
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sites, setSites] = useState([]);
  const [equipementsTotal, setEquipementsTotal] = useState(0);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [derniereMaj, setDerniereMaj] = useState(new Date());
  const [rechercheAnomalie, setRechercheAnomalie] = useState("");

  async function charger() {
    setChargement(true);
    try {
      const [adminSites, statuts, equipements] = await Promise.all([
        adminGet("/backoffice/api/v1/sites", getAuthHeader()),
        adminGet("/backoffice/api/v1/sites/statuts", getAuthHeader()),
        adminGet("/backoffice/api/v1/equipments/count", getAuthHeader()).catch(() => ({ total: 0 })),
      ]);

      const statutBySiteId = {};
      statuts.forEach((s) => { statutBySiteId[s.siteId] = s; });

      const merged = adminSites.map((site) => ({
        ...site,
        statutGlobal: statutBySiteId[site.siteId]?.statutGlobal ?? null,
        statutAnptic: statutBySiteId[site.siteId]?.statutAnptic ?? null,
        statutLan: statutBySiteId[site.siteId]?.statutLan ?? null,
      }));

      setSites(merged);
      setEquipementsTotal(equipements.total ?? 0);
      setDerniereMaj(new Date());
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 60000);
    return () => clearInterval(intervalle);
  }, []);

  const total = sites.length;
  const actifs = sites.filter((s) => s.actif).length;
  const ok = sites.filter((s) => s.statutGlobal === "OK").length;
  const warn = sites.filter((s) => s.statutGlobal === "WARN").length;
  const ko = sites.filter((s) => s.statutGlobal === "KO").length;

  const pctOk = actifs > 0 ? ((ok / actifs) * 100).toFixed(1) : "0";
  const pctWarn = actifs > 0 ? ((warn / actifs) * 100).toFixed(1) : "0";
  const pctKo = actifs > 0 ? ((ko / actifs) * 100).toFixed(1) : "0";
  const pctActifs = total > 0 ? ((actifs / total) * 100).toFixed(1) : "0";

  const enAnomalie = sites.filter((s) => s.statutGlobal === "WARN" || s.statutGlobal === "KO");
  const anomalieFiltree = enAnomalie.filter((s) => {
    const t = rechercheAnomalie.trim().toLowerCase();
    if (!t) return true;
    return s.nom.toLowerCase().includes(t) || (s.ville || "").toLowerCase().includes(t);
  });

  const nomAdmin = (auth?.username || "admin").split(".")[0].toUpperCase();
  const initiales = nomAdmin.substring(0, 2);
  const heureMaj = derniereMaj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const rayon = 88;
  const perimetre = 2 * Math.PI * rayon;
  const arcOk = (ok / (actifs || 1)) * perimetre;
  const arcWarn = (warn / (actifs || 1)) * perimetre;
  const arcKo = (ko / (actifs || 1)) * perimetre;

  const etatGlobal = parseFloat(pctOk) >= 90 ? "excellent"
    : parseFloat(pctOk) >= 70 ? "bon"
    : parseFloat(pctOk) >= 40 ? "surveiller" : "critique";

  const summaryTexts = {
    excellent: { Icon: Trophy, title: "Réseau global en excellente santé", text: "La majorité des sites RESINA sont opérationnels." },
    bon: { Icon: ThumbsUp, title: "Réseau global en bonne santé", text: `${ok} des ${actifs} sites actifs sont opérationnels.` },
    surveiller: { Icon: TriangleAlert, title: "Réseau global à surveiller", text: `Seulement ${ok} des ${actifs} sites sont opérationnels.` },
    critique: { Icon: Siren, title: "Réseau global en état critique", text: `Seulement ${ok} des ${actifs} sites sont opérationnels.` },
  };
  const summary = summaryTexts[etatGlobal];

  // Navigue vers la page cible, sauf si on s'y trouve deja : dans ce cas
  // on remonte simplement en haut de la page plutot que de ne rien faire
  // (evite qu'un clic sur la cloche/l'avatar semble "casse" quand on est
  // deja sur la page concernee).
  function irOuRemonterEnHaut(chemin) {
    if (location.pathname === chemin) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(chemin);
    }
  }

  function exporterCSV() {
    const enTete = ["Site", "Ville", "Statut ANPTIC", "Statut LAN", "Dernière alerte"];
    const lignes = enAnomalie.map((s) => [
      s.nom, s.ville || "",
      s.statutAnptic || "Inconnu",
      s.statutLan || "Inconnu",
      heureMaj,
    ]);
    const csv = [enTete, ...lignes]
      .map((ligne) => ligne.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sites-en-anomalie-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="dashboard-topbar">
        <button className="topbar-collapse-btn" onClick={() => setReduit(!reduit)}><Menu size={18} /></button>
        <div className="topbar-titles">
          <h1 className="topbar-title-welcome">Bienvenue, {nomAdmin} <Sparkle size={16} className="wave" /></h1>
          <p className="topbar-subtitle">GéoPortail RESINA — Supervision simplifiée du réseau national</p>
        </div>
        <div className="topbar-actions">
          <div className="topbar-live-badge-compact">
            <span className="live-dot"></span>
            <div>
              <div className="topbar-live-label">EN DIRECT</div>
              <div className="topbar-live-sub">Données actualisées à {heureMaj}</div>
            </div>
          </div>
          <button className="topbar-icon-btn" title="Alertes — voir l'historique des incidents"
            onClick={() => irOuRemonterEnHaut("/backoffice/incidents-historique")}>
            <Bell size={17} />
            {enAnomalie.length > 0 && (
              <span className="topbar-badge topbar-badge-orange">
                {enAnomalie.length > 99 ? "99+" : enAnomalie.length}
              </span>
            )}
          </button>
          <div className="topbar-user" role="button" tabIndex={0} title="Mon profil"
            style={{ cursor: "pointer" }}
            onClick={() => irOuRemonterEnHaut("/backoffice/mon-profil")}
            onKeyDown={(e) => { if (e.key === "Enter") irOuRemonterEnHaut("/backoffice/mon-profil"); }}>
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

        {/* KPI */}
        <div className="kpi-grid-v2">
          <div className="kpi-card-v2">
            <div className="kpi-card-icon kpi-icon-blue"><Building2 size={22} /></div>
            <div>
              <div className="kpi-card-label">SITES CONFIGURÉS</div>
              <div className="kpi-card-value">{total}</div>
              <div className="kpi-card-sub">{pctActifs}% actifs</div>
            </div>
          </div>
          <div className="kpi-card-v2">
            <div className="kpi-card-icon kpi-icon-green"><Check size={22} /></div>
            <div>
              <div className="kpi-card-label">SITES OPÉRATIONNELS</div>
              <div className="kpi-card-value kpi-value-green">{ok}</div>
              <div className="kpi-card-sub">{pctOk}% du parc</div>
            </div>
          </div>
          <div className="kpi-card-v2">
            <div className="kpi-card-icon kpi-icon-orange"><TriangleAlert size={22} /></div>
            <div>
              <div className="kpi-card-label">SITES DÉGRADÉS</div>
              <div className="kpi-card-value kpi-value-orange">{warn}</div>
              <div className="kpi-card-sub">{pctWarn}% du parc</div>
            </div>
          </div>
          <div className="kpi-card-v2">
            <div className="kpi-card-icon kpi-icon-red"><X size={22} /></div>
            <div>
              <div className="kpi-card-label">SITES HORS SERVICE</div>
              <div className="kpi-card-value kpi-value-red">{ko}</div>
              <div className="kpi-card-sub">{pctKo}% du parc</div>
            </div>
          </div>
          <div className="kpi-card-v2">
            <div className="kpi-card-icon kpi-icon-navy"><Plug size={22} /></div>
            <div>
              <div className="kpi-card-label">ÉQUIPEMENTS SUPERVISÉS</div>
              <div className="kpi-card-value">{equipementsTotal.toLocaleString("fr-FR")}</div>
              <div className="kpi-card-sub">Actifs sur le réseau</div>
            </div>
          </div>
        </div>

        {/* Santé globale */}
        <div className="health-panel">
          <div className="health-panel-header">
            <span className="health-icon"><Activity size={18} /></span>
            <h2>Santé globale du réseau RESINA</h2>
          </div>
          <div className="health-panel-body">
            <div className="health-ring">
              <svg viewBox="0 0 200 200" width="180" height="180">
                <circle cx="100" cy="100" r={rayon} fill="none" stroke="#EEF1F7" strokeWidth="18"/>
                {ok > 0 && (
                  <circle cx="100" cy="100" r={rayon} fill="none" stroke="var(--bo-ok)" strokeWidth="18"
                    strokeDasharray={`${arcOk} ${perimetre}`} transform="rotate(-90 100 100)" strokeLinecap="round"/>
                )}
                {warn > 0 && (
                  <circle cx="100" cy="100" r={rayon} fill="none" stroke="var(--bo-warn)" strokeWidth="18"
                    strokeDasharray={`${arcWarn} ${perimetre}`} strokeDashoffset={-arcOk}
                    transform="rotate(-90 100 100)" strokeLinecap="round"/>
                )}
                {ko > 0 && (
                  <circle cx="100" cy="100" r={rayon} fill="none" stroke="var(--bo-ko)" strokeWidth="18"
                    strokeDasharray={`${arcKo} ${perimetre}`} strokeDashoffset={-(arcOk + arcWarn)}
                    transform="rotate(-90 100 100)" strokeLinecap="round"/>
                )}
              </svg>
              <div className="health-ring-center">
                <div className="health-ring-value">{pctOk}%</div>
                <div className="health-ring-label">Opérationnels</div>
              </div>
            </div>

            <div className="health-legend-grid">
              <div className="health-legend-card">
                <div className="legend-card-title"><span className="dot ok"></span>Opérationnels</div>
                <div className="legend-card-value">{pctOk}%</div>
                <div className="legend-card-sub">{ok} sites</div>
              </div>
              <div className="health-legend-card">
                <div className="legend-card-title"><span className="dot warn"></span>Dégradés</div>
                <div className="legend-card-value">{pctWarn}%</div>
                <div className="legend-card-sub">{warn} sites</div>
              </div>
              <div className="health-legend-card">
                <div className="legend-card-title"><span className="dot ko"></span>Hors service</div>
                <div className="legend-card-value">{pctKo}%</div>
                <div className="legend-card-sub">{ko} sites</div>
              </div>
            </div>

            <div className={`health-summary summary-${etatGlobal}`}>
              <div className="health-summary-icon"><summary.Icon size={24} /></div>
              <div>
                <div className="health-summary-title">{summary.title}</div>
                <div className="health-summary-text">{summary.text}</div>
                <div className="health-summary-bar">
                  <div className="health-summary-bar-fill" style={{ width: `${pctOk}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sites en anomalie */}
        <div className="panel attention-panel">
          <div className="panel-header">
            <h2><Bell size={16} className="panel-title-icon" /> Sites nécessitant une attention <span className="attention-count">{enAnomalie.length}</span></h2>
            <div className="panel-header-actions">
              <button className="btn-outline" onClick={charger} disabled={chargement}>
                <RefreshCw size={13} className={chargement ? "spin-icon" : ""} /> {chargement ? "Actualisation..." : "Actualiser"}
              </button>
              <button className="btn-outline" onClick={exporterCSV}><Download size={13} /> Exporter</button>
              <input type="text" placeholder="Rechercher un site…" className="attention-search"
                value={rechercheAnomalie} onChange={(e) => setRechercheAnomalie(e.target.value)} />
            </div>
          </div>

          {enAnomalie.length === 0 && !chargement && <p>Aucun site en anomalie actuellement.</p>}

          {anomalieFiltree.length > 0 && (
            <table className="admin-table attention-table">
              <thead>
                <tr>
                  <th>SITE</th>
                  <th>LOCALISATION</th>
                  <th>STATUT ANPTIC</th>
                  <th>RÉSEAU LOCAL (LAN)</th>
                  <th>DERNIÈRE ALERTE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {anomalieFiltree.slice(0, 10).map((site) => (
                  <tr key={site.siteId}>
                    <td><div className="site-name-cell"><Building2 size={13} /> {site.nom}</div></td>
                    <td>{site.ville}</td>
                    <td>
                      <span className={`status-pill ${site.statutAnptic === "KO" ? "pill-ko" : site.statutAnptic === "WARN" ? "pill-warn" : "pill-ok"}`}>
                        <Circle size={8} fill="currentColor" stroke="none" /> {site.statutAnptic === "KO" ? "Hors service" : site.statutAnptic === "WARN" ? "Dégradé" : "Normal"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${site.statutLan === "KO" ? "pill-ko" : site.statutLan === "WARN" ? "pill-warn" : "pill-ok"}`}>
                        <Circle size={8} fill="currentColor" stroke="none" /> {site.statutLan === "KO" ? "Hors service" : site.statutLan === "WARN" ? "Dégradé" : "Normal"}
                      </span>
                    </td>
                    <td className="alerte-cell">{heureMaj}</td>
                    <td><Link to="/backoffice/sites" className="btn-voir"><Eye size={13} /> Voir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {anomalieFiltree.length > 0 && (
            <p className="attention-footer">
              Affichage de {Math.min(10, anomalieFiltree.length)} site(s) sur {enAnomalie.length}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default DashboardPage;