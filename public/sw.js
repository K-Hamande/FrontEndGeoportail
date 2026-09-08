// Service Worker minimal : recoit les notifications push envoyees par le
// backend (PushNotificationService) et les affiche, meme quand l'onglet
// du Geoportail est ferme - c'est le seul role d'un Service Worker
// necessaire pour le Web Push (pas de mise en cache/mode hors-ligne ici).

self.addEventListener("push", (event) => {
  let donnees = { title: "GéoPortail RESINA", body: "Nouvelle alerte réseau.", url: "/" };
  if (event.data) {
    try {
      donnees = { ...donnees, ...event.data.json() };
    } catch {
      donnees.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(donnees.title, {
      body: donnees.body,
      icon: "/logo_anptic_ok.png",
      badge: "/logo_anptic_ok.png",
      data: { url: donnees.url || "/" },
    })
  );
});

// Clic sur la notification : ramene au premier plan un onglet deja
// ouvert sur le Geoportail si possible, sinon en ouvre un nouveau.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(cible);
          return client.focus();
        }
      }
      return self.clients.openWindow(cible);
    })
  );
});
