/* Spitz Arcade offline cache (registered by games/kit.js, works only inside games/).
   On slow school Wi-Fi a game opens from the Chromebook's own copy, then quietly fetches the newest version for next time.
   - fonts and pictures: kept once fetched (a changed font gets a new file name)
   - game pages and kit.js: open from the cache right away, refreshed in the background (a fix shows up on the next visit)
   - questions.js, scorecode.js, data/*.json (teacher settings): always asked from the site first, the cache is only for no Wi-Fi
   Bump VERSION to throw away every old copy at once. */
var VERSION = 'spitz-v1', CACHE = VERSION;

self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});

function put(req, res){ if(res && res.ok && res.type === 'basic'){ var c = res.clone(); caches.open(CACHE).then(function(ca){ ca.put(req, c); }); } return res; }
function cacheFirst(req){ return caches.match(req).then(function(hit){ return hit || fetch(req).then(function(res){ return put(req, res); }); }); }
function staleWhileRevalidate(req, key){
  return caches.match(key).then(function(hit){
    var net = fetch(req).then(function(res){ return put(key, res); });
    if(hit){ net.catch(function(){}); return hit; }
    return net;
  });
}
function networkFirst(req){
  return fetch(req).then(function(res){ return put(req, res); }).catch(function(){ return caches.match(req).then(function(hit){ return hit || Response.error(); }); });
}

self.addEventListener('fetch', function(e){
  var req = e.request; if(req.method !== 'GET') return;
  var u = new URL(req.url); if(u.origin !== location.origin) return;          // Google Forms, the answer log etc. go straight to the network
  var p = u.pathname;
  if(/\/fonts\/|\.(woff2|png|webp|jpg|svg|ico)$/.test(p)) return e.respondWith(cacheFirst(req));
  if(/\/games\/(questions|scorecode)\.js$/.test(p) || /\/data\//.test(p)) return e.respondWith(networkFirst(req));
  if(/\/games\/[^\/]+\.(html|js)$/.test(p) && !/\/sw\.js$/.test(p)) return e.respondWith(staleWhileRevalidate(req, u.origin + p));   // one copy per game, whatever ?set= it opened with
});
