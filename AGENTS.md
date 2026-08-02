<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Data layer: MySQL, not Supabase

This project moved off Supabase to Hostinger MySQL. `@supabase/*` is uninstalled.

`@/lib/supabase/server` and `@/lib/supabase/admin` keep their old paths and
names, but return a MySQL-backed client. Keep writing queries in the familiar
builder style (`.from().select().eq()`) — see `src/lib/db/mysql.ts` for the
supported surface. If you need an operator it lacks, add it there rather than
dropping to raw SQL at the call site.

- Auth: `src/lib/db/auth.ts` (Node) and `src/lib/auth/session-token.ts`
  (Edge-safe — the middleware imports only this; never pull `mysql2` or
  `bcryptjs` into it).
- Schema: `db/mysql/schema.sql` is the source of truth. `supabase/migrations/`
  is retained for historical reference only.
- Setup and deployment: `scripts/hostinger-setup.md`.
