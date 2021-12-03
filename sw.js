/* eslint-disable no-restricted-globals, no-return-await */
/* global importScripts, workbox */
importScripts('workbox/workbox-sw.js');
workbox.setConfig({
  modulePathPrefix: 'workbox/',
});
workbox.loadModule('workbox-strategies');

const params = new URL(self.location.href).searchParams;
if (params.has('ts')) {
  workbox.routing.registerRoute(
    ({ url, event }) => /\.*\.(html|js)$/.test(url) && event.request.headers.get('Content-Type') !== 'application/json',
    async ({ url, event }) => {
      const strategy = workbox.strategies.networkFirst();
      const request = new Request(`${url}?ts=${params.get('ts')}`, { credentials: 'same-origin' });
      return await strategy.makeRequest({ event, request });
    },
  );
}

self.addEventListener('install', () => {
  self.skipWaiting();
});
