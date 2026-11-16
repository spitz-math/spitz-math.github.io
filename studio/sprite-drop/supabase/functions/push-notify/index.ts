// spitz.dev phone notifications: the database calls this on every hand-off; it sends a Web Push to each saved phone.
// Called only by the database (x-worker-secret checked against Vault). Dead subscriptions (404/410) are removed.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import webpush from 'npm:web-push@3.6.7'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const ok = await db.rpc('studio_worker_secret_ok', { p_secret: req.headers.get('x-worker-secret') || '' })
  if (ok.error || ok.data !== true) return new Response('no', { status: 401 })
  const { user_id, title, body, tag, init } = await req.json()
  // first call: make the key pair and keep it in Vault
  let priv = (await db.rpc('studio_vapid_private')).data as string | null
  if (!priv) { const k = webpush.generateVAPIDKeys(); await db.rpc('studio_vapid_save', { p_public: k.publicKey, p_private: k.privateKey }); priv = (await db.rpc('studio_vapid_private')).data }
  const pub = (await db.rpc('studio_vapid_public')).data as string | null
  if (!priv || !pub) return new Response('could not set up keys', { status: 500 })
  if (init) return Response.json({ ready: true })
  webpush.setVapidDetails('https://dev.spitzmath.com', pub, priv)
  const { data: subs } = await db.from('studio_push_subs').select('endpoint,sub').eq('user_id', user_id)
  const payload = JSON.stringify({ title: 'spitz.dev · ' + String(title || '').slice(0, 80), body: String(body || '').slice(0, 200), tag, url: 'https://dev.spitzmath.com/' })
  let sent = 0
  for (const s of subs || []) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 3600, urgency: 'high' }); sent++ }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.from('studio_push_subs').delete().eq('endpoint', s.endpoint)
      else console.error('push failed', code, String((e as Error).message).slice(0, 200))
    }
  }
  return Response.json({ sent })
})
