/* Spitz Math offline cache for the launch pad, the arcade hub and the leaderboard (registered by those three pages).
   Game pages have their own cache (games/sw.js); this one only answers for pages it controls, and only for:
   - the launch pad (/), the hub (/arcade/), the leaderboard, games/catalog.js, data/topics.json, data/leaderboard.json:
     asked from the site first, so a change shows up on the very next visit. If the site hasn't answered in 2.5 s
     (crawling school Wi-Fi) or fails, the saved copy opens instead.
   - fonts and pictures: kept once fetched.
   Everything else (Checkpoint, teacher pages, the answer log, Google) goes straight to the network.
   Bump VERSION to throw away every old copy at once. */
var VERSION = 'spitz-root-v1', CACHE = VERSION;

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return /^spitz-root-/.test(k) && k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});

function put(key, res){ if(res && res.ok && res.type === 'basic'){ var c = res.clone(); caches.open(CACHE).then(function(ca){ ca.put(key, c); }); } return res; }
function cacheFirst(req){ return caches.open(CACHE).then(function(ca){ return ca.match(req).then(function(hit){ return hit || fetch(req).then(function(res){ return put(req, res); }); }); }); }
var WAIT = 2500;
function networkFirst(req, key){
  var net = fetch(req).then(function(res){ return put(key, res); });
  var saved = function(){ return caches.open(CACHE).then(function(ca){ return ca.match(key); }); };
  return new Promise(function(done){
    var settled = false, timer = setTimeout(function(){ saved().then(function(hit){ if(hit && !settled){ settled = true; done(hit); } }); }, WAIT);
    net.then(function(res){ if(!settled){ settled = true; clearTimeout(timer); done(res); } },
      function(){ clearTimeout(timer); saved().then(function(hit){ if(!settled){ settled = true; done(hit || Response.error()); } }); });
  });
}

var PAGES = /^\/(index\.html)?$|^\/arcade\/(index\.html)?$|^\/leaderboard(\.html)?$|^\/games\/catalog\.js$|^\/data\/(topics|leaderboard)\.json$/;
self.addEventListener('fetch', function(e){
  var req = e.request; if(req.method !== 'GET') return;
  var u = new URL(req.url); if(u.origin !== location.origin) return;
  var p = u.pathname;
  if(/^\/(checkpoint|teacher|topics|stats|board|warmup)/.test(p)) return;
  if(PAGES.test(p)) return e.respondWith(networkFirst(req, u.origin + p));      // one copy per page, whatever ?v= it was asked with
  if(/^\/(fonts\/|games\/cards\/)|^\/[^\/]+\.(png|webp|jpg|svg|ico)$/.test(p)) return e.respondWith(cacheFirst(req));
});
