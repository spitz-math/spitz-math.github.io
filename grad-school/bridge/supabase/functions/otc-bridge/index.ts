// Off the Clock bridge: one MCP server that both ChatGPT and Claude connect to.
// Signed in as Kody through Supabase Auth (OAuth 2.1), so every query runs with
// Kody's own row-level security. No service-role key is used anywhere.
//
// Tools (in tools.ts)
//   Handoff board: project_rules, read_board, post_note, update_note
//   Tracker:       get_tracker, get_briefing, suggest_catch_up, read_reading, attach_reading,
//                  add_assignment, update_assignment
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { pipeline } from 'npm:@supabase/middleware@1'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.0'
import { bridgeHandler } from './tools.ts'

Deno.serve(pipeline(
  [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
  (req, { supabase, userClaims }) => {
    const userId = userClaims?.id
    if (!userId) return Promise.resolve(new Response('Sign in required', { status: 401 }))
    return bridgeHandler(supabase, userId).fetch(req)
  },
))
