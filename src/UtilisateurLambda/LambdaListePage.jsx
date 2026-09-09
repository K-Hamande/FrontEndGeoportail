import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../shared/apiClient";
import ErrorBanner from "../shared/ErrorBanner";
import LambdaLayout from "./LambdaLayout";

const TAILLE_PAGE = 30;

const RAYON = 80;
const PERIMETRE = 2 * Math.PI * RAYON;

function LambdaListePage() {
  const [sites, setSites] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [pageCourante, setPageCourante] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [derniereMaj, setDerniereMaj] = useState(null);

  function charger() {
    setErreur(null);
    apiGet("/api/v1/sites/statut-simple")
      .then((data) => {
        setSites(data);
        setDerniereMaj(new Date());
      })
      .catch((e) => setErreur(e.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 60000);
    return () => clearInterval(intervalle);
  }, []);

  const sitesFiltres = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    if (!t) return sites;
    return sites.filter((s) =>
      s.nom.toLowerCase().includes(t) || (s.ville || "").toLowerCase().includes(t)
    );
  }, [sites, recherche]);

  const total = sites.length;
  const totalOk = sites.filter((s) => s.statut === "OK").length;
  const totalKo = total - totalOk;
  const pctOk = total > 0 ? Math.round((totalOk / total) * 100) : 0;
  const arcOk = (totalOk / (total || 1)) * PERIMETRE;

  const totalPages = Math.max(1, Math.ceil(sitesFiltres.length / TAILLE_PAGE));
  const pageActuelle = Math.min(pageCourante, totalPages);
  const debut = (pageActuelle - 1) * TAILLE_PAGE;
  const sitesPage = sitesFiltres.slice(debut, debut + TAILLE_PAGE);

  const heureMaj = derniereMaj
    ? derniereMaj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const etat = pctOk >= 90 ? "excellent" : pctOk >= 70 ? "bon" : pctOk >= 40 ? "surveiller" : "critique";
  const RESUME_ETAT = {
    excellent: { titre: "Réseau national en excellente santé", icone: "🏆" },
    bon: { titre: "Réseau national en bonne santé", icone: "👍" },
    surveiller: { titre: "Réseau national à surveiller", icone: "⚠️" },
    critique: { titre: "Plusieurs sites hors service", icone: "🚨" },
  };
  const resume = RESUME_ETAT[etat];

  return (
    <LambdaLayout>
      {!chargement && total > 0 && (
        <div className="lambda-hero-card">
          <div className="lambda-hero-ring">
            <svg viewBox="0 0 180 180" width="150" height="150">
              <circle cx="90" cy="90" r={RAYON} fill="none" stroke="#EEF2F8" strokeWidth="16" />
              <circle
                cx="90" cy="90" r={RAYON} fill="none" stroke="#0D9B5A" strokeWidth="16"
                strokeDasharray={`${arcOk} ${PERIMETRE}`} strokeLinecap="round"
                transform="rotate(-90 90 90)"
              />
            </svg>
            <div className="lambda-hero-ring-center">
              <div className="lambda-hero-ring-value">{pctOk}%</div>
              <div className="lambda-hero-ring-label">Opérationnel</div>
            </div>
          </div>
          <div className="lambda-hero-texts">
            <div className="lambda-hero-title">{resume.icone} {resume.titre}</div>
            <div className="lambda-hero-sub">{totalOk} site{totalOk > 1 ? "s" : ""} opérationnel{totalOk > 1 ? "s" : ""} sur {total} au total</div>
            {heureMaj && (
              <div className="lambda-hero-live">
                <span className="live-dot"></span>
                Actualisé à {heureMaj}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="lambda-stats">
        <div className="lambda-stat-card lambda-stat-ok">
          <span className="lambda-stat-icon">🟢</span>
          <div>
            <div className="lambda-stat-value">{totalOk}</div>
            <div className="lambda-stat-label">Opérationnels</div>
          </div>
        </div>
        <div className="lambda-stat-card lambda-stat-ko">
          <span className="lambda-stat-icon">🔴</span>
          <div>
            <div className="lambda-stat-value">{totalKo}</div>
            <div className="lambda-stat-label">Hors service</div>
          </div>
        </div>
        <div className="lambda-stat-card">
          <span className="lambda-stat-icon">🏢</span>
          <div>
            <div className="lambda-stat-value">{total}</div>
            <div className="lambda-stat-label">Total sites</div>
          </div>
        </div>
      </div>

      <div className="lambda-search-bar">
        <span className="lambda-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Rechercher un site ou une ville…"
          value={recherche}
          onChange={(e) => { setRecherche(e.target.value); setPageCourante(1); }}
        />
        <span className="lambda-search-count">{sitesFiltres.length} site{sitesFiltres.length > 1 ? "s" : ""}</span>
      </div>

      {chargement && <p style={{ textAlign: "center", padding: "40px" }}>Chargement...</p>}
      <ErrorBanner message={erreur} onRetry={charger} />

      <div className="lambda-sites-grid">
        {sitesPage.map((site) => (
          <div key={site.siteId} className={`lambda-site-card ${site.statut === "OK" ? "lambda-card-ok" : "lambda-card-ko"}`}>
            <div className={`lambda-site-statut ${site.statut === "OK" ? "lambda-site-statut-ok" : "lambda-site-statut-ko"}`}>
              {site.statut === "OK" ? "✓" : "✕"}
            </div>
            <div className="lambda-site-info">
              <div className="lambda-site-nom">{site.nom}</div>
              <div className="lambda-site-ville">{site.ville}</div>
            </div>
            <div className={`lambda-site-badge ${site.statut === "OK" ? "lambda-badge-ok" : "lambda-badge-ko"}`}>
              {site.statut === "OK" ? "Opérationnel" : "Hors service"}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="lambda-pagination">
          <button disabled={pageActuelle === 1} onClick={() => setPageCourante(pageActuelle - 1)}>← Précédent</button>
          <span>{pageActuelle} / {totalPages}</span>
          <button disabled={pageActuelle === totalPages} onClick={() => setPageCourante(pageActuelle + 1)}>Suivant →</button>
        </div>
      )}
    </LambdaLayout>
  );
}

export default LambdaListePage;
