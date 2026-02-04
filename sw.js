/* eslint-disable no-restricted-globals */
/* global importScripts, workbox */
importScripts('workbox/workbox-sw.js');
workbox.setConfig({
  modulePathPrefix: 'workbox/',
});
workbox.loadModule('workbox-routing');
workbox.loadModule('workbox-strategies');
workbox.loadModule('workbox-expiration');

const params = new URL(self.location.href).searchParams;
const TS = params.get('ts');

const HTML_CACHE = 'ui-html-safe-cache';
const JS_CACHE = 'ui-js-cache';

/* ================================
   i18n → FORCE NETWORK (bypass HTTP cache)
================================ */
workbox.routing.registerRoute(
  ({ url }) => url.pathname.includes('/ui/i18n/'),
  async ({ event }) =>
    fetch(event.request, {
      cache: 'reload', // 🔥 bypass browser HTTP cache
      credentials: 'same-origin',
    }),
);

/* ================================
   API & server pages → NEVER cache
================================ */
workbox.routing.registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/nuxeo/api/') || url.pathname.startsWith('/nuxeo/json/') || url.pathname.endsWith('.jsp'),
  new workbox.strategies.NetworkOnly(),
);

/* ================================
   HTML under /nuxeo/ui
   Cache only "leaf" HTML (no imports)
================================ */
workbox.routing.registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/nuxeo/ui/') &&
    url.pathname.endsWith('.html') &&
    request.headers.get('Content-Type') !== 'application/json',

  async ({ event }) => {
    const cache = await caches.open(HTML_CACHE);

    try {
      // Always try network first
      const networkResponse = await fetch(event.request);

      const clone = networkResponse.clone();
      const text = await clone.text();
      const hasHtmlImport = /<link\s+rel=["']import["'][^>]*>/i.test(text);

      // Only cache HTML without Polymer imports
      if (!hasHtmlImport) {
        await cache.put(event.request, networkResponse.clone());
      }

      return networkResponse;
    } catch (err) {
      // Fallback to cache if offline
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }
      throw err;
    }
  },
);

/* ================================
   JS files (versioned via ts)
================================ */
if (TS) {
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.endsWith('.js'),
    new workbox.strategies.NetworkFirst({
      cacheName: JS_CACHE,
      plugins: [
        {
          requestWillFetch: async ({ request }) => {
            const newUrl = `${request.url}?ts=${TS}`;
            return new Request(newUrl, { credentials: 'same-origin' });
          },
        },
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          purgeOnQuotaError: true,
        }),
      ],
    }),
  );
}

/* ================================
   Lifecycle
================================ */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
