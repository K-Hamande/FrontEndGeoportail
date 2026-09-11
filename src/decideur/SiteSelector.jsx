import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

function SiteSelector({ sites, siteId, onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const conteneurRef = useRef(null);
  const inputRef = useRef(null);

  const siteSelectionne = sites.find((s) => s.siteId === siteId);

  const sitesFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    if (!texte) return sites;
    return sites.filter(
      (s) => s.nom.toLowerCase().includes(texte) || s.ville.toLowerCase().includes(texte)
    );
  }, [sites, recherche]);

  // Ferme le menu si on clique n'importe ou en dehors du composant.
  useEffect(() => {
    function surClicExterieur(e) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  function ouvrirMenu() {
    setOuvert(true);
    setRecherche("");
    // Le champ de recherche vient d'apparaitre dans le DOM - on lui donne
    // le focus juste apres, une fois le rendu effectue.
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  function choisirSite(site) {
    onChange(site.siteId);
    setOuvert(false);
  }

  return (
    <div className="selector-box" ref={conteneurRef}>
      <div style={{ flex: 1, position: "relative" }}>
        <div className="selector-label">Site sélectionné</div>

        <button type="button" className="site-select-trigger" onClick={ouvrirMenu}>
          {siteSelectionne ? siteSelectionne.nom : "Choisir un site…"}
        </button>

        {ouvert && (
          <div className="site-select-panel">
            <input
              ref={inputRef}
              type="text"
              className="site-select-search"
              placeholder="Rechercher par nom ou ville…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />

            <div className="site-select-count">
              {sitesFiltres.length} site{sitesFiltres.length > 1 ? "s" : ""}
            </div>

            <div className="site-select-list">
              {sitesFiltres.length === 0 && (
                <div className="site-select-empty">Aucun résultat</div>
              )}
              {sitesFiltres.map((site) => (
                <button
                  type="button"
                  key={site.siteId}
                  className={`site-select-item ${site.siteId === siteId ? "site-select-item-actif" : ""}`}
                  onClick={() => choisirSite(site)}
                >
                  <div className="site-select-item-nom">{site.nom}</div>
                  <div className="site-select-item-ville">{site.ville}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <span style={{ opacity: 0.7, display: "inline-flex" }}>{ouvert ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
    </div>
  );
}

export default SiteSelector;