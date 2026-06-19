/* AMT GMP 서비스워커 — 네트워크 우선(최신 유지), 오프라인 시 캐시 폴백 */
const CACHE = 'amt-gmp-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 옛 캐시 정리
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 네트워크 우선: 항상 최신 화면을 받고, 같은 출처(GMP 앱 파일)만 캐시해 둠.
  // Firebase / gstatic(데이터·SDK)은 캐시하지 않고 항상 네트워크로.
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      try {
        const url = new URL(req.url);
        if (url.origin === self.location.origin) {
          const copy = res.clone();
          const c = await caches.open(CACHE);
          c.put(req, copy);
        }
      } catch (_) {}
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      // 문서 요청 오프라인 폴백
      if (req.mode === 'navigate') {
        const shell = await caches.match('./gmp-AMT.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
