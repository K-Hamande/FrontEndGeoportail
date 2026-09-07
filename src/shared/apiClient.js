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

  return response.json();
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

  return response.status === 204 ? null : response.json();
}
