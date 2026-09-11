import { useEffect, useState } from "react";
import {
  Trash2, Ban, PauseCircle, PlayCircle, Sparkles, RotateCcw, KeyRound, Pencil, FileText,
  ScrollText, X, Download, CalendarDays, Clock, TrendingUp, Users,
} from "lucide-react";
import { useAuth } from "../shared/AuthContext";
import { adminGet } from "../shared/backofficeApiClient";
import Topbar from "./Topbar";
import SearchableSelect from "../shared/SearchableSelect";
import ErrorBanner from "../shared/ErrorBanner";

// Transforme "Xavier KIWALO" en "KIWALO X." (nom de famille en majuscules
// + initiale du prenom), pour reprendre exactement le format d'affichage
// de la maquette de reference.
function formaterNomAffiche(nomComplet) {
  if (!nomComplet) return "Utilisateur inconnu";
  const mots = nomComplet.trim().split(/\s+/);
  if (mots.length < 2) return nomComplet.toUpperCase();

  const prenom = mots[0];
  const nomDeFamille = mots.slice(1).join(" ");
  return `${nomDeFamille.toUpperCase()} ${prenom.charAt(0).toUpperCase()}.`;
}

// Formate en "DD/MM/YYYY" + "HHhMM" (avec la lettre "h" comme separateur,
// convention administrative francophone reprise dans la maquette),
// plutot que le format ISO par defaut de toLocaleTimeString ("HH:MM").
function formaterDateHeure(dateIso) {
  const date = new Date(dateIso);
  const jour = String(date.getDate()).padStart(2, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const annee = date.getFullYear();
  const heures = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { dateAffichee: `${jour}/${mois}/${annee}`, heureAffichee: `${heures}h${minutes}` };
}

// "Aujourd'hui" / "Hier" / "vendredi 29 août 2026" - regroupe les entrees
// du journal par jour civil pour une lecture en frise chronologique
// plutot qu'une liste plate.
function libelleJour(dateIso) {
  const d = new Date(dateIso);
  const debutJour = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const aujourdHui = new Date();
  const debutAujourdHui = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate());
  const debutHier = new Date(debutAujourdHui);
  debutHier.setDate(debutHier.getDate() - 1);

  if (debutJour.getTime() === debutAujourdHui.getTime()) return "Aujourd'hui";
  if (debutJour.getTime() === debutHier.getTime()) return "Hier";
  const libelle = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

// Classification des entrees par type d'action (a partir du libelle
// francais deja stocke en base - il n'existe pas de champ "categorie"
// cote backend). L'ordre compte : "desactivation"/"reactivation"
// contiennent tous les deux la sous-chaine "activation", donc ils sont
// testes avant le cas generique "activation".
const CATEGORIES_ACTION = [
  { key: "suppression", test: /suppression/i, label: "Suppression", Icon: Trash2, color: "#D93535" },
  { key: "revocation", test: /révocation/i, label: "Révocation", Icon: Ban, color: "#D93535" },
  { key: "desactivation", test: /désactivation/i, label: "Désactivation", Icon: PauseCircle, color: "#C97C0A" },
  { key: "reactivation", test: /réactivation/i, label: "Réactivation", Icon: PlayCircle, color: "#0D9B5A" },
  { key: "activation", test: /activation/i, label: "Activation", Icon: PlayCircle, color: "#0D9B5A" },
  { key: "creation", test: /création/i, label: "Création", Icon: Sparkles, color: "#0D9B5A" },
  { key: "reinitialisation", test: /réinitialisation/i, label: "Réinitialisation", Icon: RotateCcw, color: "#C97C0A" },
  { key: "motdepasse", test: /mot de passe/i, label: "Mot de passe", Icon: KeyRound, color: "#4A9EFF" },
  { key: "modification", test: /modification|coordonnées/i, label: "Modification", Icon: Pencil, color: "#0A3D7A" },
];
const CATEGORIE_AUTRE = { key: "autre", label: "Autre", Icon: FileText, color: "#6B7280" };

function categoriser(action) {
  return CATEGORIES_ACTION.find((c) => c.test.test(action)) || CATEGORIE_AUTRE;
}

function AuditLogPage() {
  const { getAuthHeader } = useAuth();
  const [entries, setEntries] = useState([]);
  const [nomsParLogin, setNomsParLogin] = useState({});
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreAuteur, setFiltreAuteur] = useState("");
  const [filtreType, setFiltreType] = useState("");

  function charger() {
    // Les deux appels sont independants (le journal et la liste des
    // utilisateurs) - on les lance en parallele avec Promise.all,
    // exactement comme deja fait pour le Tableau de bord (Etape 9).
    setChargement(true);
    Promise.all([
      adminGet("/backoffice/api/v1/audit-log", getAuthHeader()),
      adminGet("/backoffice/api/v1/users", getAuthHeader()),
    ])
      .then(([auditEntries, users]) => {
        setEntries(auditEntries);

        const lookup = {};
        users.forEach((u) => { lookup[u.login] = u.nomComplet; });
        setNomsParLogin(lookup);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function echapperCsv(valeur) {
    const texte = String(valeur ?? "");
    if (texte.includes(",") || texte.includes('"') || texte.includes("\n")) {
      return '"' + texte.replace(/"/g, '""') + '"';
    }
    return texte;
  }

  function exporter() {
    const entetes = ["Date", "Catégorie", "Auteur", "Action", "Détails"];
    const lignes = entriesFiltrees.map((e) =>
      [
        new Date(e.horodatage).toLocaleString("fr-FR"),
        e.categorie.label,
        nomsParLogin[e.auteur] ?? e.auteur,
        e.action,
        e.details ?? "",
      ]
        .map(echapperCsv)
        .join(",")
    );
    const contenu = "﻿" + entetes.join(",") + "\n" + lignes.join("\n");
    const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journal-activite.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const maintenant = new Date();
  const debutAujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const ilYA7Jours = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);

  const entriesCategorisees = entries.map((e) => ({ ...e, categorie: categoriser(e.action) }));

  const nbAujourdHui = entriesCategorisees.filter((e) => new Date(e.horodatage) >= debutAujourdHui).length;
  const nb7Jours = entriesCategorisees.filter((e) => new Date(e.horodatage) >= ilYA7Jours).length;
  const utilisateursActifs = new Set(entriesCategorisees.map((e) => e.auteur)).size;

  const auteursDistincts = [...new Set(entries.map((e) => e.auteur))]
    .sort((a, b) => formaterNomAffiche(nomsParLogin[a]).localeCompare(formaterNomAffiche(nomsParLogin[b]), "fr"));

  function correspondAuTexte(e) {
    if (!filtreTexte.trim()) return true;
    const t = filtreTexte.trim().toLowerCase();
    const nomAffiche = formaterNomAffiche(nomsParLogin[e.auteur]).toLowerCase();
    return (
      nomAffiche.includes(t) ||
      e.action.toLowerCase().includes(t) ||
      (e.details ?? "").toLowerCase().includes(t)
    );
  }

  // Repartition par categorie : reflete les filtres auteur/texte deja
  // actifs (comme la page Equipements) mais pas le filtre de categorie
  // lui-meme, pour que les cartes restent toutes cliquables et
  // comparables entre elles.
  const entriesPourRepartition = entriesCategorisees.filter((e) => !filtreAuteur || e.auteur === filtreAuteur).filter(correspondAuTexte);
  const repartition = [...CATEGORIES_ACTION, CATEGORIE_AUTRE]
    .map((cat) => ({
      ...cat,
      count: entriesPourRepartition.filter((e) => e.categorie.key === cat.key).length,
    }))
    .filter((cat) => cat.count > 0)
    .sort((a, b) => b.count - a.count);
  const totalRepartition = entriesPourRepartition.length || 1;

  const entriesFiltrees = entriesCategorisees.filter((e) => {
    if (filtreType && e.categorie.key !== filtreType) return false;
    if (filtreAuteur && e.auteur !== filtreAuteur) return false;
    return correspondAuTexte(e);
  });

  // Regroupement en frise chronologique : "Aujourd'hui", "Hier", puis
  // par date - les entrees arrivent deja triees du plus recent au plus
  // ancien depuis l'API, on preserve donc cet ordre.
  const groupesParJour = [];
  entriesFiltrees.forEach((e) => {
    const libelle = libelleJour(e.horodatage);
    const dernierGroupe = groupesParJour[groupesParJour.length - 1];
    if (dernierGroupe && dernierGroupe.libelle === libelle) {
      dernierGroupe.entries.push(e);
    } else {
      groupesParJour.push({ libelle, entries: [e] });
    }
  });

  const aDesFiltres = filtreTexte || filtreAuteur || filtreType;

  function effacerFiltres() {
    setFiltreTexte("");
    setFiltreAuteur("");
    setFiltreType("");
  }

  return (
    <>
      <Topbar
        title="Journal d'activité"
        subtitle="Traçabilité de toutes les modifications effectuées dans le Backoffice — conservation 90 jours minimum"
        onRefresh={charger}
        chargement={chargement}
      />

      <div className="backoffice-content">
        <ErrorBanner message={erreur} onRetry={charger} />

        {!chargement && (
          <>
            {/* KPI */}
            <div className="kpi-grid-v2" style={{ marginBottom: "20px" }}>
              <div className="kpi-card-v2">
                <div className="kpi-card-icon kpi-icon-navy"><ScrollText size={22} /></div>
                <div>
                  <div className="kpi-card-label">ÉVÉNEMENTS SUIVIS</div>
                  <div className="kpi-card-value">{entries.length}</div>
                  <div className="kpi-card-sub">500 plus récents conservés</div>
                </div>
              </div>
              <div className="kpi-card-v2">
                <div className="kpi-card-icon kpi-icon-blue"><Clock size={22} /></div>
                <div>
                  <div className="kpi-card-label">AUJOURD'HUI</div>
                  <div className="kpi-card-value">{nbAujourdHui}</div>
                  <div className="kpi-card-sub">événement(s) enregistré(s)</div>
                </div>
              </div>
              <div className="kpi-card-v2">
                <div className="kpi-card-icon kpi-icon-green"><TrendingUp size={22} /></div>
                <div>
                  <div className="kpi-card-label">7 DERNIERS JOURS</div>
                  <div className="kpi-card-value">{nb7Jours}</div>
                  <div className="kpi-card-sub">activité récente</div>
                </div>
              </div>
              <div className="kpi-card-v2">
                <div className="kpi-card-icon kpi-icon-orange"><Users size={22} /></div>
                <div>
                  <div className="kpi-card-label">UTILISATEURS ACTIFS</div>
                  <div className="kpi-card-value">{utilisateursActifs}</div>
                  <div className="kpi-card-sub">ont agi dans le Backoffice</div>
                </div>
              </div>
            </div>

            {/* Repartition par type d'action */}
            {repartition.length > 0 && (
              <div className="eq-stats-section">
                <h2 className="eq-stats-title">Répartition par type d'action</h2>
                <div className="eq-stats-grid">
                  {repartition.map((cat) => {
                    const pourcentage = Math.round((cat.count / totalRepartition) * 100);
                    return (
                      <div key={cat.key} className="eq-stat-card"
                        onClick={() => setFiltreType(filtreType === cat.key ? "" : cat.key)}
                        style={{
                          borderTop: `3px solid ${cat.color}`,
                          cursor: "pointer",
                          background: filtreType === cat.key ? "#F0F4FB" : "white",
                        }}>
                        <div className="eq-stat-icon"><cat.Icon size={20} /></div>
                        <div style={{ flex: 1 }}>
                          <div className="eq-stat-label">{cat.label.toUpperCase()}</div>
                          <div className="eq-stat-value">{cat.count}</div>
                          <div className="eq-stat-bar">
                            <div className="eq-stat-bar-fill" style={{ width: `${pourcentage}%`, background: cat.color }}></div>
                          </div>
                          <div className="eq-stat-pct">{pourcentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="panel">
          <div className="panel-header" style={{ flexWrap: "wrap", gap: "8px" }}>
            <h2><CalendarDays size={16} className="panel-title-icon" /> Frise des événements <span className="attention-count" style={{ background: "var(--bo-primary)" }}>{entriesFiltrees.length}</span></h2>
            <div className="panel-header-actions" style={{ flexWrap: "wrap", gap: "8px" }}>
              <input
                className="attention-search"
                placeholder="Rechercher (auteur, action, détails)…"
                value={filtreTexte}
                onChange={(e) => setFiltreTexte(e.target.value)}
              />

              <div className="cascade-group">
                <label className="cascade-label">Auteur</label>
                <SearchableSelect selectClassName="attention-search" value={filtreAuteur} onChange={(e) => setFiltreAuteur(e.target.value)}>
                  <option value="">Tous les auteurs</option>
                  {auteursDistincts.map((login) => (
                    <option key={login} value={login}>{formaterNomAffiche(nomsParLogin[login])}</option>
                  ))}
                </SearchableSelect>
              </div>

              {aDesFiltres && (
                <button className="btn-outline" onClick={effacerFiltres}><X size={13} /> Effacer les filtres</button>
              )}

              <button className="btn-outline" onClick={exporter}><Download size={13} /> Exporter</button>
            </div>
          </div>

          {chargement && <p>Chargement...</p>}

          {!chargement && groupesParJour.map((groupe) => (
            <div key={groupe.libelle}>
              <div className="audit-day-heading">{groupe.libelle}</div>
              <div className="audit-list">
                {groupe.entries.map((entry) => {
                  const { heureAffichee } = formaterDateHeure(entry.horodatage);
                  const nomAffiche = formaterNomAffiche(nomsParLogin[entry.auteur]);
                  const cat = entry.categorie;

                  return (
                    <div key={entry.id} className="audit-entry">
                      <div className="audit-icon-bubble" style={{ background: cat.color + "1A", color: cat.color }}>
                        <cat.Icon size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="audit-line">
                          <span className="audit-time">{heureAffichee}</span>{" "}
                          <strong>{nomAffiche}</strong>
                          <span className="audit-category-tag" style={{ background: cat.color + "1A", color: cat.color }}>
                            {cat.label}
                          </span>
                        </div>
                        <div className="audit-action">
                          {entry.action}{entry.details ? ` — ${entry.details}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!chargement && entriesFiltrees.length === 0 && (
            <p>{entries.length === 0 ? "Aucune activité enregistrée." : "Aucun événement ne correspond à ces filtres."}</p>
          )}
        </div>
      </div>
    </>
  );
}

export default AuditLogPage;