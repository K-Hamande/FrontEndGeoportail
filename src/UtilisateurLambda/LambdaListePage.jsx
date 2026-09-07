import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../shared/apiClient";
import ErrorBanner from "../shared/ErrorBanner";
import LambdaLayout from "./LambdaLayout";

const TAILLE_PAGE = 30;

function LambdaListePage() {
  const [sites, setSites] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [pageCourante, setPageCourante] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  function charger() {
    setErreur(null);
    apiGet("/api/v1/sites/statut-simple")
      .then(setSites)
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

  const totalOk = sites.filter((s) => s.statut === "OK").length;
  const totalKo = sites.filter((s) => s.statut === "KO").length;
  const totalPages = Math.max(1, Math.ceil(sitesFiltres.length / TAILLE_PAGE));
  const pageActuelle = Math.min(pageCourante, totalPages);
  const debut = (pageActuelle - 1) * TAILLE_PAGE;
  const sitesPage = sitesFiltres.slice(debut, debut + TAILLE_PAGE);

  return (
    <LambdaLayout>
      <div className="lambda-stats">
        <div className="lambda-stat-card lambda-stat-ok">
          <div className="lambda-stat-value">{totalOk}</div>
          <div className="lambda-stat-label">🟢 Opérationnels</div>
        </div>
        <div className="lambda-stat-card lambda-stat-ko">
          <div className="lambda-stat-value">{totalKo}</div>
          <div className="lambda-stat-label">🔴 Hors service</div>
        </div>
        <div className="lambda-stat-card">
          <div className="lambda-stat-value">{sites.length}</div>
          <div className="lambda-stat-label">Total sites</div>
        </div>
      </div>

      <div className="lambda-search-bar">
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
            <div className="lambda-site-statut">
              {site.statut === "OK" ? "🟢" : "🔴"}
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