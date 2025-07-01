/* eslint-disable no-restricted-globals, no-return-await */
/* global importScripts, workbox */
importScripts('workbox/workbox-sw.js');
workbox.setConfig({
  modulePathPrefix: 'workbox/',
});
workbox.loadModule('workbox-routing');
workbox.loadModule('workbox-strategies');

const params = new URL(self.location.href).searchParams;
if (params.has('ts')) {
  workbox.routing.registerRoute(
    ({ url, request }) => /\.*\.(html|js)$/.test(url) && request.headers.get('Content-Type') !== 'application/json',
    new workbox.strategies.NetworkFirst({
      plugins: [
        {
          requestWillFetch: async ({ request }) =>
            new Request(`${request.url}?ts=${params.get('ts')}`, { credentials: 'same-origin' }),
        },
      ],
    }),
  );
}

self.addEventListener('install', () => {
  self.skipWaiting();
});
