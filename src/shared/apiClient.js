import { getDecideurToken, clearDecideurAuth } from "./decideurAuth";
import { construireErreurApi, erreurConnexionImpossible } from "./httpError";

export async function apiGet(path) {
  const token = getDecideurToken();
  const estBackoffice = window.location.pathname.startsWith("/backoffice");

  if (!token && !estBackoffice) {
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Non connecté");
  }

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  let response;
  try {
    response = await fetch(path, { headers });
  } catch {
    throw erreurConnexionImpossible();
  }

  if (response.status === 401 && !estBackoffice) {
    clearDecideurAuth();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expirée");
  }

  if (!response.ok) {
    throw await construireErreurApi(response);
  }

  return lireCorpsJson(response);
}

export async function apiPost(path, body) {
  const token = getDecideurToken();
  const estBackoffice = window.location.pathname.startsWith("/backoffice");

  if (!token && !estBackoffice) {
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Non connecté");
  }

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw erreurConnexionImpossible();
  }

  if (response.status === 401 && !estBackoffice) {
    clearDecideurAuth();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expirée");
  }

  if (!response.ok) {
    throw await construireErreurApi(response);
  }

  return lireCorpsJson(response);
}

// Certains endpoints (ex: enregistrement d'un abonnement push) renvoient
// un corps VIDE avec un statut 200 (pas 204) - response.json() plante
// alors avec "Unexpected end of JSON input". On lit le texte d'abord et
// on ne parse que s'il y a vraiment quelque chose, comme deja fait dans
// backofficeApiClient.js.
async function lireCorpsJson(response) {
  const texte = await response.text();
  return texte ? JSON.parse(texte) : null;
}
