import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../shared/apiClient";
import { useSiteSelection } from "../shared/SiteSelectionContext";
import ErrorBanner from "../shared/ErrorBanner";
import DecideurLayout from "./DecideurLayout";
import UpdateBar from "./UpdateBar";
import AnpticStatusCard from "./AnpticStatusCard";
import LanStatusCard from "./LanStatusCard";

const INTERVALLE_ACTUALISATION_DEFAUT_S = 60; // repris de AdminSupervisionService.DEFAUT_INTERVALLE_S

function MonSitePage() {
  const { siteId, sites } = useSiteSelection();
  const siteSelectionne = sites.find((site) => site.siteId === siteId);
  const intervalleActualisationMs =
    (siteSelectionne?.intervalleActualisationS ?? INTERVALLE_ACTUALISATION_DEFAUT_S) * 1000;
  const [anpticData, setAnpticData] = useState(null);
  const [lanData, setLanData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const chargerStatuts = useCallback(async () => {
    if (!siteId) return;
    setIsLoading(true);
    setErreur(null);
    try {
      const [anptic, lan] = await Promise.all([
        apiGet(`/api/v1/site/${siteId}/anptic`),
        apiGet(`/api/v1/site/${siteId}/lan`),
      ]);
      setAnpticData(anptic);
      setLanData(lan);
      setLastUpdated(new Date());
    } catch (err) {
      setErreur(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    chargerStatuts();
  }, [chargerStatuts]);

  useEffect(() => {
    const intervalle = setInterval(chargerStatuts, intervalleActualisationMs);
    return () => clearInterval(intervalle);
  }, [chargerStatuts, intervalleActualisationMs]);

  return (
    <DecideurLayout>
      <UpdateBar lastUpdated={lastUpdated} onRefresh={chargerStatuts} isLoading={isLoading} />
      <ErrorBanner message={erreur} onRetry={chargerStatuts} />
      <AnpticStatusCard data={anpticData} />
      <LanStatusCard data={lanData} />
    </DecideurLayout>
  );
}

export default MonSitePage;