import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./shared/AuthContext";
import { SiteSelectionProvider } from "./shared/SiteSelectionContext";
import { estConnecteDecideur, getDecideurAuth } from "./shared/decideurAuth";
import DecideurLoginPage from "./decideur/DecideurLoginPage";
import MonSitePage from "./decideur/MonSitePage";
import CartePage from "./decideur/CartePage";
import AlertesPage from "./decideur/AlertesPage";
import LambdaListePage from "./UtilisateurLambda/LambdaListePage";
import LoginPage from "./backoffice/LoginPage";
import ProtectedRoute from "./backoffice/ProtectedRoute";
import BackofficeLayout from "./backoffice/BackofficeLayout";
import DashboardPage from "./backoffice/DashboardPage";
import SitesPage from "./backoffice/SitesPage";
import EquipmentsPage from "./backoffice/EquipmentsPage";
import CartographyPage from "./backoffice/CartographyPage";
import NotificationsAdminPage from "./backoffice/NotificationsAdminPage";
import UsersPage from "./backoffice/UsersPage";
import AuditLogPage from "./backoffice/AuditLogPage";
import SiteFormPage from "./backoffice/SiteFormPage";
import MinistryTokensPage from "./backoffice/MinistryTokensPage";
import SupervisionPage from "./backoffice/SupervisionPage";
import DecideurUsersPage from "./backoffice/DecideurUsersPage";
import MonProfilPage from "./backoffice/MonProfilPage";
import RolesPage from "./backoffice/RolesPage";
import IncidentsHistoriquePage from "./backoffice/IncidentsHistoriquePage";

// Acces "utilisateur lambda" (statut simplifie OK/KO, sans compte ni
// connexion - vue publique, premiere page vue au lancement du site) vs
// acces "decideur" (compte + mot de passe, tableau de bord complet par
// ministere) : la racine "/" affiche l'un ou l'autre selon qu'un decideur
// est effectivement connecte, plutot que d'exiger une connexion pour
// tout le monde comme avant. Un role LAMBDA authentifie (ancien systeme
// de comptes, conserve pour compatibilite mais plus utilise pour de
// nouveaux acces) est traite comme "non decideur" et voit la meme vue
// publique - un seul chemin a maintenir.
function DecideurRoutes() {
  const auth = getDecideurAuth();
  const estDecideurAuthentifie = estConnecteDecideur() && auth?.role === "DECIDEUR";

  return (
    <Routes>
      {/* Page de connexion, pour les decideurs qui ont un compte */}
      <Route path="/login" element={<DecideurLoginPage />} />

      {estDecideurAuthentifie ? (
        // SiteSelectionProvider en layout partage : une SEULE instance pour
        // les 3 pages (Mon site / Carte / Alertes), montee une fois et
        // conservee lors de la navigation entre elles (via <Outlet/>),
        // pour que le site selectionne dans le header reste coherent
        // partout - cf. commentaire de SiteSelectionContext.jsx.
        <Route element={<SiteSelectionProvider><Outlet /></SiteSelectionProvider>}>
          <Route index element={<MonSitePage />} />
          <Route path="carte" element={<CartePage />} />
          <Route path="alertes" element={<AlertesPage />} />
        </Route>
      ) : (
        <Route index element={<LambdaListePage />} />
      )}

      {/* Toute autre URL (anciens liens /lambda, ou /carte et /alertes
          quand on n'est pas connecte decideur) revient a la vue publique
          plutot que d'afficher une page blanche ou d'imposer une connexion. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Backoffice en premier - priorite sur le catch-all /* */}
          <Route path="/backoffice/login" element={<LoginPage />} />
          <Route
            path="/backoffice/*"
            element={<ProtectedRoute><BackofficeLayout /></ProtectedRoute>}
          >
            <Route index element={<DashboardPage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="equipments" element={<EquipmentsPage />} />
            <Route path="cartography" element={<CartographyPage />} />
            <Route path="notifications" element={<NotificationsAdminPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="sites/new" element={<SiteFormPage />} />
            <Route path="sites/:siteId/edit" element={<SiteFormPage />} />
            <Route path="ministry-tokens" element={<MinistryTokensPage />} />
            <Route path="supervision" element={<SupervisionPage />} />
            <Route path="decideur-users" element={<DecideurUsersPage />} />
            <Route path="mon-profil" element={<MonProfilPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="incidents-historique" element={<IncidentsHistoriquePage />} />
          </Route>

          {/* Decideur/Lambda - catch-all en dernier */}
          <Route path="/*" element={<DecideurRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;