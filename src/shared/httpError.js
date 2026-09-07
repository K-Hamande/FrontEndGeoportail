// Construit un message d'erreur comprehensible a partir d'une reponse
// HTTP en echec, au lieu d'exposer le code + le chemin technique
// ("Erreur API (502) sur /backoffice/api/v1/sites") directement a
// l'ecran. Reutilise par apiClient.js (decideur) et backofficeApiClient.js.
const MESSAGES_PAR_STATUT = {
  502: "Le serveur est actuellement injoignable.",
  503: "Le service est temporairement indisponible.",
  504: "Le serveur met trop de temps à répondre.",
};

// Le backend renvoie souvent un corps JSON {"message": "..."} explicite
// (ex: "Un compte avec ce login existe déjà.") - on le privilegie quand
// il existe, plutot que de le jeter et d'afficher un message generique.
export async function construireErreurApi(response) {
  let messageBackend = null;
  try {
    const texte = await response.text();
    if (texte) {
      messageBackend = JSON.parse(texte)?.message ?? null;
    }
  } catch {
    // Reponse non-JSON (ex: page d'erreur HTML d'un proxy) : ignoree,
    // on retombe sur un message generique ci-dessous.
  }

  if (messageBackend) {
    return new Error(messageBackend);
  }

  return new Error(
    MESSAGES_PAR_STATUT[response.status] ?? `La requête a échoué (code ${response.status}).`
  );
}

// Le serveur ne repond pas du tout (backend arrete, DNS/reseau en
// echec...) : fetch() rejette AVANT d'obtenir une reponse, ce cas ne
// passe donc jamais par construireErreurApi ci-dessus.
export function erreurConnexionImpossible() {
  return new Error(
    "Impossible de contacter le serveur. Vérifiez qu'il est démarré, puis réessayez."
  );
}
