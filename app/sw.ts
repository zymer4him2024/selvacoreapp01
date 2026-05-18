/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type RuntimeCaching,
} from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// Domains that must NOT be cached: real-time streaming, auth tokens, signed
// URLs. Caching them caused "Cache.put() encountered a network error" because
// some return 206 / opaque / event-stream responses the Cache API rejects.
const NO_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebaseremoteconfig.googleapis.com',
  'fcmregistrations.googleapis.com',
  'fcm.googleapis.com',
];

const skipCacheRoute: RuntimeCaching = {
  matcher: ({ url }) => NO_CACHE_HOSTS.includes(url.hostname),
  handler: new NetworkOnly(),
};

// Fast-timeout HTML / RSC routes: on slow mobile networks, fall back to cached
// shell after 3s instead of waiting indefinitely on serwist's default NetworkFirst.
// Matchers mirror defaultCache's HTML+RSC entries; first match wins, so these
// take precedence over the unbounded defaults below.
const fastHtmlRoute: RuntimeCaching = {
  matcher: ({ request, url: { pathname }, sameOrigin }) =>
    request.headers.get('Content-Type')?.includes('text/html') === true &&
    sameOrigin &&
    !pathname.startsWith('/api/'),
  handler: new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
};

const fastRscRoute: RuntimeCaching = {
  matcher: ({ request, url: { pathname }, sameOrigin }) =>
    request.headers.get('RSC') === '1' && sameOrigin && !pathname.startsWith('/api/'),
  handler: new NetworkFirst({
    cacheName: 'pages-rsc',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
};

// Patch defaultCache: prepend the skip route so streaming endpoints bypass any
// cache strategy. Then add a CacheableResponsePlugin (status 200 only) to the
// cross-origin route so opaque/206 responses don't crash Cache.put().
const runtimeCaching: RuntimeCaching[] = [
  skipCacheRoute,
  fastRscRoute,
  fastHtmlRoute,
  ...defaultCache.map((entry) => {
    if (entry.handler && 'plugins' in entry.handler) {
      const handler = entry.handler as { plugins?: unknown[] };
      if (Array.isArray(handler.plugins)) {
        handler.plugins.push(new CacheableResponsePlugin({ statuses: [200] }));
      }
    }
    return entry;
  }),
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  disableDevLogs: true,
});

serwist.addEventListeners();
