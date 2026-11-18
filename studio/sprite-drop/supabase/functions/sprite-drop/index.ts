// Sprite Drop: a throwaway test bridge for Spitz.dev.
// Question it answers: can ChatGPT hand an image it just made to a tool as real bytes,
// and can Claude fetch those same bytes later in another session?
//
// Runs in its OWN Supabase project (never Off the Clock). Signed in through Supabase's
// OAuth 2.1 server, so every query runs under the owner's row-level security.
// The server key is used for one thing only: recording pixel proofs (studio_record_proof), see below.
//
// Tools: drop_asset, list_assets, get_asset, whoami, and Task Drop's create_task, list_tasks, get_task, post_message
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { pipeline } from 'npm:@supabase/middleware@1'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.0'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { type Db, handlerFor, type RecordProof, type Who } from './tools.ts'

// Optional lock: set SPRITE_DROP_OWNER_EMAIL in the function's secrets and every other account is refused.
const OWNER = (Deno.env.get('SPRITE_DROP_OWNER_EMAIL') || '').trim().toLowerCase()

// The token was already verified by withSupabase; this only reads its claims for whoami.
function whoFrom(req: Request, userId: string, email: string): Who {
  let c: Record<string, unknown> = {}
  try { c = JSON.parse(atob((req.headers.get('authorization') || '').split(' ')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { /* no readable claims */ }
  const s = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return { user_id: userId, email: email || null, client_id: s(c.client_id), session_id: s(c.session_id), owner_lock: OWNER ? 'match' : 'off' }
}

// Proofs are recorded with the server key: studio_record_proof refuses every signed-in caller, including the AIs.
// Only the fixed proof code in tools.ts uses this client, and only for that one call.
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), URL_ = Deno.env.get('SUPABASE_URL')
const prover = SERVICE && URL_ ? createClient(URL_, SERVICE, { auth: { persistSession: false } }) : null
const recordProof: RecordProof | undefined = prover ? async (args) => { const r = await prover.rpc('studio_record_proof', args); return { data: r.data, error: r.error } } : undefined

Deno.serve(pipeline(
  [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
  (req, { supabase, userClaims }) => {
    const userId = userClaims?.id
    if (!userId) return Promise.resolve(new Response('Sign in required', { status: 401 }))
    // deno-lint-ignore no-explicit-any
    const email = String((userClaims as any)?.email ?? '').toLowerCase()
    if (OWNER && email !== OWNER) return Promise.resolve(new Response('This bridge belongs to someone else.', { status: 403 }))
    return handlerFor(supabase as unknown as Db, userId, whoFrom(req, userId, email), { recordProof }).fetch(req)
  },
))
