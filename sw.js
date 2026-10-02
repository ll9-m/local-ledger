var CACHE = 'local-ledger-v15';
var ASSETS = ['./', './index.html', './add.html', './cat.html', './manage.html', './app.css', './store.js', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function(){}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  var isPage = e.request.mode === 'navigate' ||
    url.pathname === '/' || url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  function put(req, res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function(){});
  }

  // 页面：网络优先，保证拿到最新版本；断网时回退缓存
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) put(e.request, res);
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200) put(e.request, res);
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
