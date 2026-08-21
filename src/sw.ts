/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

// Custom service worker (injectManifest). Replicates what generateSW gave us
// (precache + SPA navigation fallback, Supabase never intercepted) and adds a
// notificationclick handler so tapping the rest-done notification focuses the
// app instead of doing nothing.

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/supabase/],
  }),
);

// Server-scheduled rest push (see lib/push.ts + supabase/functions/rest-timer).
// Same tag as the page-fired local notification, so if both arrive the card
// is deduped instead of stacking.
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string } | null = null;
  try {
    data = event.data?.json() ?? null;
  } catch {
    // Not JSON — show the fallback text.
  }
  event.waitUntil(
    self.registration.showNotification(data?.title ?? "Rest done — go", {
      body: data?.body ?? "",
      tag: "rest-done",
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (wins.length > 0) {
        await wins[0].focus();
      } else {
        await self.clients.openWindow(self.registration.scope);
      }
    })(),
  );
});
