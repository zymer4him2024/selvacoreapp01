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

// When the 3s NetworkFirst times out AND there is no cached response (e.g. the
// first visit to an uncached dynamic route whose SSR is cold-starting), the
// strategy would otherwise throw `no-response` and break the navigation. Wait
// out a plain (untimed) network fetch instead; only if that also fails do we
// let the error fall through to serwist's offline fallback.
const waitOutNetworkOnError = {
  handlerDidError: async ({ request }: { request: Request }) => {
    try {
      return await fetch(request);
    } catch {
      return undefined;
    }
  },
};

// Fast-timeout HTML / RSC routes: on slow mobile networks, fall back to cached
// shell after 3s instead of waiting indefinitely on serwist's default NetworkFirst.
// Matchers mirror defaultCache's HTML+RSC entries; first match wins, so these
// take precedence over the unbounded defaults below.
const fastHtmlRoute: RuntimeCaching = {
  // Match hard navigations via request.mode, not Content-Type: a GET navigation
  // has no request body, so the Content-Type header is absent and never matched.
  matcher: ({ request, url: { pathname }, sameOrigin }) =>
    request.mode === 'navigate' && sameOrigin && !pathname.startsWith('/api/'),
  handler: new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
      waitOutNetworkOnError,
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
      waitOutNetworkOnError,
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
  // Serve the precached offline page when a document navigation fails (network
  // unreachable / timed out AND no cache hit). Without this, NetworkFirst throws
  // "no-response" and the page breaks instead of degrading gracefully.
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
