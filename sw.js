// با هر بروزرسانی بزرگ، عدد نسخه را عوض کنید (v1 → v2 ...) تا کش قدیمی پاک شود
const CACHE = 'qualipart-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('qualipart-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.url.toLowerCase().includes('.pdf')) return; // PDFها کش نمی‌شوند

  // صفحه اصلی: اول اینترنت (قیمت‌های جدید)، ولی اگر تا ۲.۵ ثانیه جواب نداد یا نبود، از نسخه ذخیره‌شده
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      });
      if (!cached) return net;                              // بار اول: چاره‌ای جز اینترنت نیست
      e.waitUntil(net.catch(() => {}));                     // بروزرسانی کش حتی اگر زود از نسخه ذخیره‌شده جواب بدیم
      return Promise.race([net.catch(() => cached), new Promise(r => setTimeout(() => r(cached), 2500))]);
    })());
    return;
  }
  // بقیه: از کش و همزمان بروزرسانی
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
