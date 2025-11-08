/**
 * Service Worker for Field App
 * Caches app shell and static assets only
 * Does NOT cache API responses - all data comes from IndexedDB
 */

const CACHE_NAME = 'field-app-v1';
const APP_SHELL = [
  '/field-app',
  '/field-app/login',
  '/field-app/download',
  '/field-app/sync',
  '/field-app/work/*'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      
      // Cache essential files
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]).catch(err => {
        console.error('[ServiceWorker] Failed to cache:', err);
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache for app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls - never cache them
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle field-app routes - serve index.html for client-side routing
  if (url.pathname.startsWith('/field-app')) {
    event.respondWith(
      fetch('/index.html')
        .then(response => {
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('/index.html', responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Offline - try cache
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // For other assets, use network-first strategy
  event.respondWith(
    fetch(request)
      .then(response => {
        // Don't cache non-200 responses
        if (!response || response.status !== 200) {
          return response;
        }
        
        // Clone and cache successful responses
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request);
      })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
    event.ports[0].postMessage({ cleared: true });
  }
});