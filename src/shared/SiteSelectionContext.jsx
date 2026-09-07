import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "./apiClient";

const SiteSelectionContext = createContext(null);

// Cle de persistance du site selectionne. Volontairement en sessionStorage
// et non dans l'URL : l'id de site (identifiant interne) ne doit pas
// apparaitre en clair dans l'adresse (partage de lien, historique, logs
// de proxy/navigateur).
const CLE_SITE_SELECTIONNE = "resina-site-selectionne";

// Partage la liste des sites et le site actuellement selectionne entre
// les 3 pages decideur (Mon site / Carte / Alertes), pour que le
// selecteur du header reste disponible et coherent partout, pas
// seulement sur "Mon site".
export function SiteSelectionProvider({ children }) {
  const [sites, setSites] = useState([]);
  const [siteId, setSiteIdState] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiGet("/api/v1/sites").then((data) => {
      setSites(data);
      const siteMemorise = sessionStorage.getItem(CLE_SITE_SELECTIONNE);
      const siteMemoriseValide = data.some((site) => site.siteId === siteMemorise);
      if (siteMemoriseValide) setSiteIdState(siteMemorise);
      else if (data.length > 0) setSiteIdState(data[0].siteId);
    });
  }, []);

  // Choisir un site depuis n'importe quelle page ramene vers "Mon site"
  // pour ce site - comportement previsible, plutot que de gerer un
  // filtrage different sur Carte/Alertes qui affichent tous les sites.
  // L'id est memorise en sessionStorage, jamais ajoute a l'URL.
  function choisirSite(nouveauSiteId) {
    setSiteIdState(nouveauSiteId);
    sessionStorage.setItem(CLE_SITE_SELECTIONNE, nouveauSiteId);
    navigate("/");
  }

  return (
    <SiteSelectionContext.Provider value={{ sites, siteId, choisirSite, setSiteIdState }}>
      {children}
    </SiteSelectionContext.Provider>
  );
}

export function useSiteSelection() {
  return useContext(SiteSelectionContext);
}