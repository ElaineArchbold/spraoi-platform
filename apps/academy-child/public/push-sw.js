self.addEventListener("push", (event) => {
  let payload = {
    title: "Spraoi",
    body: "You have a new update.",
    url: "/",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Spraoi", {
      body: payload.body || "You have a new update.",
      icon: payload.icon || "/favicon-192.png",
      badge: payload.badge || "/favicon-192.png",
      tag: payload.tag || undefined,
      data: {
        url: payload.url || "/",
        ...payload.data,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
