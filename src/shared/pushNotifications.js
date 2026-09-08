import { apiGet, apiPost } from "./apiClient";

// Web Push standard : Service Worker + PushManager, pris en charge par
// Chrome/Edge/Firefox (desktop et Android) et Safari iOS 16.4+ (PWA
// installee sur l'ecran d'accueil uniquement - Safari ne l'autorise pas
// dans un onglet de navigateur classique).
export function pushEstSupporte() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// L'API PushManager attend la cle VAPID sous forme de Uint8Array, pas la
// chaine base64url renvoyee par le backend - conversion standard.
function base64UrlVersUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(base64);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

// Orchestre l'activation complete : permission navigateur -> UN SEUL
// abonnement PushManager pour cet appareil -> enregistrement cote backend
// pour chacun des sites fournis (un decideur suit generalement plusieurs
// sites de son ministere - cf. AlertesPage, qui agrege les incidents de
// tous ces sites). Leve une erreur (message directement affichable) a la
// premiere etape qui echoue.
export async function activerPushPourSites(siteIds, profil) {
  if (!pushEstSupporte()) {
    throw new Error("Les notifications ne sont pas prises en charge par ce navigateur.");
  }
  if (!siteIds || siteIds.length === 0) {
    throw new Error("Aucun site à notifier.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission de notification refusée.");
  }

  const { publicKey } = await apiGet("/api/v1/push/public-key");
  if (!publicKey) {
    throw new Error("Les notifications push ne sont pas encore configurées côté serveur.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let abonnement = await registration.pushManager.getSubscription();
  if (!abonnement) {
    abonnement = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlVersUint8Array(publicKey),
    });
  }

  const sujetJson = abonnement.toJSON();
  await Promise.all(
    siteIds.map((siteId) =>
      apiPost(`/api/v1/site/${siteId}/notifications/register`, {
        profil: profil || "Décideur",
        endpoint: sujetJson.endpoint,
        keys: sujetJson.keys,
      })
    )
  );
}

// Etat actuel de la permission navigateur, pour adapter l'affichage du
// bouton (ex: le griser si deja "denied", inutile de re-proposer).
export function permissionPushActuelle() {
  if (!pushEstSupporte()) return "non-supporte";
  return Notification.permission; // "default" | "granted" | "denied"
}

// Verifie si CET appareil a deja un abonnement actif (ex: active lors
// d'une session precedente) - evite de re-proposer l'activation a chaque
// visite de la page Alertes.
export async function abonnementPushExistant() {
  if (!pushEstSupporte()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return false;
  const abonnement = await registration.pushManager.getSubscription();
  return Boolean(abonnement);
}
