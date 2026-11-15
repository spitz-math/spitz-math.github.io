// Sprite Drop: a throwaway test bridge for Spitz.dev.
// Question it answers: can ChatGPT hand an image it just made to a tool as real bytes,
// and can Claude fetch those same bytes later in another session?
//
// Runs in its OWN Supabase project (never Off the Clock). Signed in through Supabase's
// OAuth 2.1 server, so every query runs under the owner's row-level security.
// No service-role key is used.
//
// Tools: drop_asset, list_assets, get_asset, whoami, and Task Drop's create_task, list_tasks, get_task, post_message
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { pipeline } from 'npm:@supabase/middleware@1'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.0'
import { type Db, handlerFor, type Who } from './tools.ts'

// Optional lock: set SPRITE_DROP_OWNER_EMAIL in the function's secrets and every other account is refused.
const OWNER = (Deno.env.get('SPRITE_DROP_OWNER_EMAIL') || '').trim().toLowerCase()

// The token was already verified by withSupabase; this only reads its claims for whoami.
function whoFrom(req: Request, userId: string, email: string): Who {
  let c: Record<string, unknown> = {}
  try { c = JSON.parse(atob((req.headers.get('authorization') || '').split(' ')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { /* no readable claims */ }
  const s = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return { user_id: userId, email: email || null, client_id: s(c.client_id), session_id: s(c.session_id), owner_lock: OWNER ? 'match' : 'off' }
}

Deno.serve(pipeline(
  [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
  (req, { supabase, userClaims }) => {
    const userId = userClaims?.id
    if (!userId) return Promise.resolve(new Response('Sign in required', { status: 401 }))
    // deno-lint-ignore no-explicit-any
    const email = String((userClaims as any)?.email ?? '').toLowerCase()
    if (OWNER && email !== OWNER) return Promise.resolve(new Response('This bridge belongs to someone else.', { status: 403 }))
    return handlerFor(supabase as unknown as Db, userId, whoFrom(req, userId, email)).fetch(req)
  },
))
