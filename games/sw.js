/* Spitz Arcade offline cache (registered by games/kit.js, works only inside games/).
   On slow school Wi-Fi a game the Chromebook has opened before still opens from its own saved copy, even with no Wi-Fi at all.
   - fonts and pictures: kept once fetched (a changed font gets a new file name)
   - game pages, kit.js, questions.js, scorecode.js: asked from the site first, so a fix shows up on the very next visit (2026-10-24).
     If the site hasn't answered in 2.5 seconds (crawling Wi-Fi) the saved copy opens instead, and the new one is still saved for next time.
   - data/*.json (teacher settings) is read by questions.js with a request the cache never sees
   Bump VERSION to throw away every old copy at once. */
var VERSION = 'spitz-v4', CACHE = VERSION;

self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});

function put(req, res){ if(res && res.ok && res.type === 'basic'){ var c = res.clone(); caches.open(CACHE).then(function(ca){ ca.put(req, c); }); } return res; }
function cacheFirst(req){ return caches.match(req).then(function(hit){ return hit || fetch(req).then(function(res){ return put(req, res); }); }); }
/* the site first; the saved copy if the site fails, or is slower than WAIT ms and a saved copy exists */
var WAIT = 2500;
function networkFirst(req, key){
  key = key || req;
  var net = fetch(req).then(function(res){ return put(key, res); });
  return new Promise(function(done){
    var settled = false, timer = setTimeout(function(){ caches.match(key).then(function(hit){ if(hit && !settled){ settled = true; done(hit); } }); }, WAIT);
    net.then(function(res){ if(!settled){ settled = true; clearTimeout(timer); done(res); } },
      function(){ clearTimeout(timer); caches.match(key).then(function(hit){ if(!settled){ settled = true; done(hit || Response.error()); } }); });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request; if(req.method !== 'GET') return;
  var u = new URL(req.url); if(u.origin !== location.origin) return;          // Google Forms, the answer log etc. go straight to the network
  var p = u.pathname;
  if(/\/fonts\/|\.(woff2|png|webp|jpg|svg|ico)$/.test(p)) return e.respondWith(cacheFirst(req));
  if(/\/games\/[^\/]+\.(html|js)$/.test(p) && !/\/sw\.js$/.test(p)) return e.respondWith(networkFirst(req, u.origin + p));   // one copy per game, whatever ?set= it opened with
});
