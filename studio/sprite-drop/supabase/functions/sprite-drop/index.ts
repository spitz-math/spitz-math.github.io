// Sprite Drop: a throwaway test bridge for Spitz.dev.
// Question it answers: can ChatGPT hand an image it just made to a tool as real bytes,
// and can Claude fetch those same bytes later in another session?
//
// Runs in its OWN Supabase project (never Off the Clock). Signed in through Supabase's
// OAuth 2.1 server, so every query runs under the owner's row-level security.
// No service-role key is used.
//
// Tools: drop_asset, list_assets, get_asset
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { pipeline } from 'npm:@supabase/middleware@1'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.0'
import { type Db, handlerFor } from './tools.ts'

// Optional lock: set SPRITE_DROP_OWNER_EMAIL in the function's secrets and every other account is refused.
const OWNER = (Deno.env.get('SPRITE_DROP_OWNER_EMAIL') || '').trim().toLowerCase()

Deno.serve(pipeline(
  [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
  (req, { supabase, userClaims }) => {
    const userId = userClaims?.id
    if (!userId) return Promise.resolve(new Response('Sign in required', { status: 401 }))
    // deno-lint-ignore no-explicit-any
    const email = String((userClaims as any)?.email ?? '').toLowerCase()
    if (OWNER && email !== OWNER) return Promise.resolve(new Response('This bridge belongs to someone else.', { status: 403 }))
    return handlerFor(supabase as unknown as Db, userId).fetch(req)
  },
))
