# Rebuilds sprite-drop.bundle.ts (one file for the dashboard / deploy) from image.ts + tools.ts + index.ts.
import re, os
D=os.path.dirname(os.path.abspath(__file__)); F=D+'/supabase/functions/sprite-drop/'
head=("// Sprite Drop, ONE-FILE copy for pasting into the Supabase dashboard editor.\n"
"// Generated from index.ts + tools.ts + tasks.ts + proof.ts + image.ts in spitz-arcade/studio/sprite-drop by make_bundle.py. Edit those, not this.\n"
"import 'jsr:@supabase/functions-js/edge-runtime.d.ts'\n"
"import { pipeline } from 'npm:@supabase/middleware@1'\n"
"import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.0'\n"
"import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.4.0'\n"
"import { z } from 'npm:zod@^4.3.6'\n"
"import { decode as decodePngLib } from 'npm:fast-png@6.3.0'\n"
"import { createClient } from 'npm:@supabase/supabase-js@2.119.0'\n")
out=[head]
for n in ['image.ts','proof.ts','tasks.ts','tools.ts','index.ts']:
  src=open(F+n).read()
  src=re.sub(r"^import [^\n]*\n",'',src,flags=re.M)
  out.append('\n// ---------- %s ----------\n'%n+src.strip('\n')+'\n')
open(D+'/sprite-drop.bundle.ts','w').write(''.join(out))
