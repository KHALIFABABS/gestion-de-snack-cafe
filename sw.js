/* ============================================================
   SERVICE WORKER — Mon Café v1.4
   Fonctionne 100% offline après le premier chargement
   ============================================================ */

const CACHE_NAME = 'mon-cafe-v1.4.0';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

/* INSTALLATION — mise en cache de la coquille */
self.addEventListener('install', event => {
  console.log('📦 SW: installation');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS).catch(err => {
        console.log('⚠️ SW: certains fichiers non cachés', err);
      });
    })
  );
  self.skipWaiting();
});

/* ACTIVATION — nettoyage anciens caches */
self.addEventListener('activate', event => {
  console.log('✅ SW: activation');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('🗑️ SW: suppression ancien cache', k);
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

/* FETCH — stratégie Cache First, Network Fallback */
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  if(!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) {
        // Mise à jour en arrière-plan
        fetch(event.request).then(response => {
          if(response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return caches.match('./index.html').then(fallback => {
          return fallback || new Response(
            '<h1>Hors ligne</h1><p>Reconnectez-vous au WiFi une fois pour installer l\'app.</p>',
            {headers: {'Content-Type': 'text/html'}}
          );
        });
      });
    })
  );
});

/* MESSAGE — forcer mise à jour */
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});