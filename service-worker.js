const CACHE_NAME = 'sharkpro-cache-v3'; // Versão do cache atualizada
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/auth.js',
    '/report.js',
    '/manifest.json',
    '/icons/shark_512.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@400;500;600&display=swap'
];

// Instala o Service Worker e armazena os assets em cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cache aberto e assets adicionados.');
                // Usamos addAll para uma operação atômica. Se um falhar, todos falham.
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Falha ao adicionar assets ao cache durante a instalação.', error);
            })
    );
});

// Intercepta as requisições e responde com a estratégia "Cache, caindo para a rede"
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Se o recurso estiver no cache, retorna ele.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Se não, busca na rede.
                return fetch(event.request).then((networkResponse) => {
                    // Clona a resposta da rede para poder armazená-la em cache e retorná-la.
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Armazena a nova resposta em cache para futuras requisições.
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                }).catch(error => {
                    console.error('Service Worker: Erro ao buscar recurso na rede.', error);
                    // Opcional: Retornar uma página de fallback offline aqui.
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
