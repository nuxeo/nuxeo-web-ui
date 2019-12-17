importScripts('workbox/workbox-sw.js');
workbox.loadModule('workbox-strategies');

const params = new URL(self.location.href).searchParams;
if (params.has('ts')) {
  workbox.routing.registerRoute(/\.*\.(html|js)$/, async ({ url, event }) => {
    const strategy = workbox.strategies.networkFirst();
    const request = new Request(`${url}?ts=${params.get('ts')}`, { credentials: 'same-origin' });
    return await strategy.makeRequest({ event, request });
  });
}

self.addEventListener('install', () => {
  self.skipWaiting();
});
