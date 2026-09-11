import { useEffect, useState } from "react";
import {
  TriangleAlert, Check, Search, Star, Circle, Settings, Clock, Signal, Zap,
  Bell, Radio, Building2, CheckCheck, RotateCcw,
} from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { adminGet, adminPut, adminDelete } from "../shared/backofficeApiClient";
import Topbar from "./Topbar";

// §3.2.6b du CDC : configuration des parametres de supervision par site
// (intervalle d'actualisation, seuils d'alerte, notifications push par
// evenement). Les sites non personnalises utilisent les valeurs par
// defaut renvoyees par le backend (badge "Défaut").
function SupervisionPage() {
  const { getAuthHeader } = useAuth();
  const [settings, setSettings] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [siteId, setSiteId] = useState(null);
  const [brouillon, setBrouillon] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);

  function charger() {
    adminGet("/backoffice/api/v1/supervision", getAuthHeader())
      .then((data) => {
        setSettings(data);
        if (data.length > 0 && !siteId) {
          setSiteId(data[0].siteId);
          setBrouillon(data[0]);
        }
      })
      .catch((err) => setErreur(err.message));
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    const s = settings.find((x) => x.siteId === siteId);
    if (s) setBrouillon({ ...s });
    setMessage(null);
  }, [siteId]);

  const sitesFiltres = settings.filter((s) => {
    const texte = recherche.trim().toLowerCase();
    if (!texte) return true;
    return s.siteNom.toLowerCase().includes(texte) || s.ville.toLowerCase().includes(texte);
  });

  useEffect(() => {
    if (sitesFiltres.length === 0) return;
    if (!sitesFiltres.some((s) => s.siteId === siteId)) {
      setSiteId(sitesFiltres[0].siteId);
    }
  }, [recherche, settings]);

  function modifier(champ, valeur) {
    setBrouillon((prev) => ({ ...prev, [champ]: valeur }));
  }

  async function enregistrer() {
    setErreur(null);
    setMessage(null);
    try {
      await adminPut(`/backoffice/api/v1/supervision/${siteId}`, getAuthHeader(), {
        intervalleActualisationS: Number(brouillon.intervalleActualisationS),
        debitMinimalMbps: Number(brouillon.debitMinimalMbps),
        latenceMaximaleMs: Number(brouillon.latenceMaximaleMs),
        notificationsActives: brouillon.notificationsActives,
        notifPanneAnptic: brouillon.notifPanneAnptic,
        notifPanneLan: brouillon.notifPanneLan,
        notifRetablissement: brouillon.notifRetablissement,
      });
      setMessage("Paramètres enregistrés.");
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function reinitialiser() {
    setErreur(null);
    setMessage(null);
    try {
      await adminDelete(`/backoffice/api/v1/supervision/${siteId}`, getAuthHeader());
      setMessage("Paramètres réinitialisés aux valeurs par défaut.");
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (!brouillon) {
    return (
      <>
        <Topbar title="Paramètres supervision" subtitle="Seuils d'alerte et intervalles par site" onRefresh={charger} />
        <div className="backoffice-content"><p>Chargement...</p></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Paramètres supervision" subtitle="Seuils d'alerte, intervalle d'actualisation et notifications par site" onRefresh={charger} />

      <div className="backoffice-content">
        {erreur && <p className="sup-message ko"><TriangleAlert size={14} /> Erreur : {erreur}</p>}
        {message && <p className="sup-message ok"><Check size={14} /> {message}</p>}

        <div className="sup-layout">
          {/* ---- Colonne de gauche : recherche + liste de sites ---- */}
          <div className="sup-picker">
            <div className="sup-search">
              <span className="sup-search-icon"><Search size={14} /></span>
              <input
                type="text"
                placeholder="Rechercher un site…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <div className="sup-count">{sitesFiltres.length} site{sitesFiltres.length > 1 ? "s" : ""}</div>
            <div className="sup-site-list">
              {sitesFiltres.length === 0 && (
                <div className="sup-site-empty">Aucun site ne correspond à « {recherche} ».</div>
              )}
              {sitesFiltres.map((s) => (
                <button
                  type="button"
                  key={s.siteId}
                  className={`sup-site-row ${s.siteId === siteId ? "active" : ""}`}
                  onClick={() => setSiteId(s.siteId)}
                >
                  <span className={`sup-site-dot ${s.personnalise ? "personnalise" : ""}`}></span>
                  <span className="sup-site-texts">
                    <span className="sup-site-nom">{s.siteNom}</span>
                    <br />
                    <span className="sup-site-ville">{s.ville}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ---- Colonne de droite : hero + metriques + notifications ---- */}
          <div>
            <div className="sup-hero">
              <div>
                <div className="sup-hero-title">{brouillon.siteNom}</div>
                <div className="sup-hero-sub">{brouillon.ville}</div>
              </div>
              <span className={`sup-hero-badge ${brouillon.personnalise ? "personnalise" : ""}`}>
                {brouillon.personnalise ? <><Star size={12} /> Personnalisé</> : <><Circle size={12} /> Valeurs par défaut</>}
              </span>
            </div>

            <h2 className="sup-section-title"><Settings size={15} /> Seuils et actualisation</h2>
            <div className="sup-metric-grid">
              <div className="sup-metric-card">
                <div className="sup-metric-head">
                  <span className="sup-metric-icon kpi-icon-navy"><Clock size={16} /></span>
                  <span className="sup-metric-label">Intervalle d'actualisation</span>
                </div>
                <div className="sup-metric-input-row">
                  <input
                    type="number"
                    min="10"
                    value={brouillon.intervalleActualisationS}
                    onChange={(e) => modifier("intervalleActualisationS", e.target.value)}
                  />
                  <span className="sup-metric-unit">sec</span>
                </div>
                <p className="sup-metric-hint">Fréquence de rafraîchissement automatique côté décideur.</p>
              </div>

              <div className="sup-metric-card">
                <div className="sup-metric-head">
                  <span className="sup-metric-icon kpi-icon-blue"><Signal size={16} /></span>
                  <span className="sup-metric-label">Débit minimal acceptable</span>
                </div>
                <div className="sup-metric-input-row">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={brouillon.debitMinimalMbps}
                    onChange={(e) => modifier("debitMinimalMbps", e.target.value)}
                  />
                  <span className="sup-metric-unit">Mbps</span>
                </div>
                <p className="sup-metric-hint">En dessous, la liaison est signalée « dégradée ».</p>
              </div>

              <div className="sup-metric-card">
                <div className="sup-metric-head">
                  <span className="sup-metric-icon kpi-icon-orange"><Zap size={16} /></span>
                  <span className="sup-metric-label">Latence maximale acceptable</span>
                </div>
                <div className="sup-metric-input-row">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={brouillon.latenceMaximaleMs}
                    onChange={(e) => modifier("latenceMaximaleMs", e.target.value)}
                  />
                  <span className="sup-metric-unit">ms</span>
                </div>
                <p className="sup-metric-hint">Au-delà, la qualité du lien est dégradée dans le score affiché.</p>
              </div>
            </div>

            <h2 className="sup-section-title"><Bell size={15} /> Notifications push</h2>
            <div className="sup-toggle-panel">
              <div className="sup-toggle-row principal">
                <span className="sup-toggle-icon"><Bell size={17} /></span>
                <span className="sup-toggle-texts">
                  <span className="sup-toggle-title">Notifications activées pour ce site</span>
                  <span className="sup-toggle-desc">Interrupteur général — désactive tout le reste si éteint.</span>
                </span>
                <span className="sup-switch">
                  <input
                    type="checkbox"
                    checked={brouillon.notificationsActives}
                    onChange={(e) => modifier("notificationsActives", e.target.checked)}
                  />
                  <span className="sup-switch-track"></span>
                </span>
              </div>

              <div className={`sup-toggle-row ${brouillon.notificationsActives ? "" : "dim"}`}>
                <span className="sup-toggle-icon"><Radio size={17} /></span>
                <span className="sup-toggle-texts">
                  <span className="sup-toggle-title">Panne ANPTIC</span>
                  <span className="sup-toggle-desc">Alerte en cas de coupure de la liaison WAN (réseau national).</span>
                </span>
                <span className="sup-switch">
                  <input
                    type="checkbox"
                    checked={brouillon.notifPanneAnptic}
                    disabled={!brouillon.notificationsActives}
                    onChange={(e) => modifier("notifPanneAnptic", e.target.checked)}
                  />
                  <span className="sup-switch-track"></span>
                </span>
              </div>

              <div className={`sup-toggle-row ${brouillon.notificationsActives ? "" : "dim"}`}>
                <span className="sup-toggle-icon"><Building2 size={17} /></span>
                <span className="sup-toggle-texts">
                  <span className="sup-toggle-title">Panne LAN</span>
                  <span className="sup-toggle-desc">Alerte en cas d'incident sur le réseau local du bâtiment.</span>
                </span>
                <span className="sup-switch">
                  <input
                    type="checkbox"
                    checked={brouillon.notifPanneLan}
                    disabled={!brouillon.notificationsActives}
                    onChange={(e) => modifier("notifPanneLan", e.target.checked)}
                  />
                  <span className="sup-switch-track"></span>
                </span>
              </div>

              <div className={`sup-toggle-row ${brouillon.notificationsActives ? "" : "dim"}`}>
                <span className="sup-toggle-icon"><CheckCheck size={17} /></span>
                <span className="sup-toggle-texts">
                  <span className="sup-toggle-title">Rétablissement</span>
                  <span className="sup-toggle-desc">Alerte dès qu'un incident est résolu (ANPTIC ou LAN).</span>
                </span>
                <span className="sup-switch">
                  <input
                    type="checkbox"
                    checked={brouillon.notifRetablissement}
                    disabled={!brouillon.notificationsActives}
                    onChange={(e) => modifier("notifRetablissement", e.target.checked)}
                  />
                  <span className="sup-switch-track"></span>
                </span>
              </div>
            </div>

            <div className="sup-actions">
              <button className="btn-primary" onClick={enregistrer}>Enregistrer</button>
              {brouillon.personnalise && (
                <button className="btn-outline" onClick={reinitialiser}><RotateCcw size={13} /> Réinitialiser aux valeurs par défaut</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SupervisionPage;
