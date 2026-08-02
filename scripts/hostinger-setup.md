# Hostinger setup — JobPulse India

The app now runs on **Hostinger MySQL** instead of Supabase. Auth, sessions,
password reset, resume file storage, and job ingestion are all backed by your
own database.

> **Note:** the site now runs on Hostinger itself, not Vercel. A plan with
> Node.js support serves the Next.js app directly — responses carry
> `platform: hostinger` alongside the usual `x-nextjs-cache` headers. A
> database-only *web hosting* plan cannot do this; on those you still need a
> separate Node host and point the domain at it.

---

## 1. Create the database (hPanel)

1. hPanel → **Databases → Management**.
2. Create a new MySQL database, e.g. name `jobpulse`, and a database user.
   Hostinger prefixes both with your account id (`u123456789_jobpulse`).
3. Save the password — it is shown only once.
4. Still on that page, note the **hostname** (something like `srv1234.hstgr.io`).

### Allow remote connections (required)

The site connects from outside Hostinger, so the database must accept remote
access:

hPanel → **Databases → Remote MySQL** → add access host.
- Safest: add the specific egress IPs of your host.
- Simplest: tick **Any host** (`%`). The account is limited to this one
  database, and the password is long — but prefer specific IPs if you can.

---

## 2. Fill in `.env`

Copy the values into your local `.env` (see `.env.example` for the full list):

```
MYSQL_HOST=srv1234.hstgr.io
MYSQL_PORT=3306
MYSQL_DATABASE=u123456789_jobpulse
MYSQL_USER=u123456789_jobpulse
MYSQL_PASSWORD=the-password-you-saved
MYSQL_POOL_LIMIT=3
```

`AUTH_JWT_SECRET` has already been generated into your local `.env`. If you
ever need a new one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Create the tables

```bash
node --env-file=.env scripts/setup-mysql.mjs --admin you@example.com --password 'ChooseAStrongPassword'
```

This applies `db/mysql/schema.sql` (35 tables) and creates your admin login.
The script is safe to re-run.

If remote MySQL is blocked for any reason, you can instead open
hPanel → **phpMyAdmin** → *Import* and upload `db/mysql/schema.sql`, then create
the admin user by running the script later or signing up and promoting the row.

---

## 4. Email (password reset)

1. hPanel → **Emails** → create a mailbox such as `no-reply@yourdomain.com`.
2. Add to `.env`:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=no-reply@yourdomain.com
SMTP_PASSWORD=the-mailbox-password
SMTP_FROM=JobPulse India <no-reply@yourdomain.com>
```

Without these, password-reset emails are skipped (logged server-side instead);
everything else still works.

---

## 5. Deploy

Set the same variables on the host running the site — hPanel → **Websites →
your site → Node.js → Environment variables** (or Vercel's project settings if
you host there instead).

Variables needed in production: all `MYSQL_*`, `AUTH_JWT_SECRET`, all `SMTP_*`,
plus the existing `CRON_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, Razorpay keys,
and `NEXT_PUBLIC_SITE_URL`.

The old `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` variables are
no longer read and can be deleted.

> **`NEXT_PUBLIC_SITE_URL` is baked in at build time**, not read at runtime —
> it is inlined into every canonical tag, `og:url`, JSON-LD block, and
> `sitemap.xml` entry when the bundle is compiled. Changing it in hPanel does
> nothing until you **rebuild**. If canonicals point at the wrong origin, that
> is always this variable.

---

## 6. Point your Hostinger domain at the site

hPanel → **Domains → DNS Zone**, then either:

- **Subdomain-free apex:** add an `A` record `@ → 76.76.21.21`, and a `CNAME`
  `www → cname.vercel-dns.com`; or
- follow the exact records Vercel shows under Project → Settings → Domains
  after you add your domain there.

Then set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` and rebuild.

---

## 6a. Delete Hostinger's default `robots.txt` (blocks Google)

Hostinger drops a static `robots.txt` into the document root of
`*.hostingersite.com` preview domains so temporary URLs never get indexed. It
contains:

```
User-agent: Googlebot
Disallow: /

User-agent: *
Allow: /
```

That file is served by the edge **before the request ever reaches Next.js**, so
it silently overrides [`src/app/robots.ts`](../src/app/robots.ts). Adding a
`public/robots.txt` will not help — it gets shadowed the same way.

How to tell which one you are getting: every route Next serves picks up the
security headers from `next.config.ts`. Compare them.

```bash
curl -sI https://yourdomain.com/robots.txt | grep -i "x-frame-options"
```

- **No output** → the static Hostinger file is winning. Delete it.
- **`X-Frame-Options: DENY`** → Next is serving it correctly.

Remove it via hPanel → **Files → File Manager** → document root → delete
`robots.txt` (or `rm ~/public_html/robots.txt` over SSH). Re-run the curl check
above to confirm.

Leave this in place and Google will never crawl the site, no matter what the
sitemap or canonical tags say.

---

## 6b. Optional: a staging database for end-to-end testing

The Playwright suite creates users and creates/approves/rejects jobs, so it must
never point at the live database. Give it its own:

1. hPanel → **Databases → MySQL Databases** → create `..._staging` with its own
   user and a **fresh password** (do not reuse the production one).
2. hPanel → **Databases → Remote MySQL** → add the IP you will run tests from.
   Hostinger blocks outside connections by default.
3. Create `.env.local` in the project root — it is git-ignored and takes
   precedence over `.env`:

```bash
MYSQL_HOST=<staging host>
MYSQL_PORT=3306
MYSQL_DATABASE=<staging db>
MYSQL_USER=<staging user>
MYSQL_PASSWORD=<staging password>
AUTH_JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Create the schema, seed fixtures, and run the whole suite:

```bash
npm run verify:panels
```

That chains `db:setup` (applies `db/mysql/schema.sql`), `setup:e2e` (seeds admin,
candidate, and employer users), and `playwright test` — covering admin job
approve/reject/feature, the candidate journey, employer onboarding and
applicants, and cross-tenant security boundaries.

Once that passes, copy the **same variable names** (with production values) into
hPanel → Node.js → Environment variables and rebuild.

---

## 7. Verify

```bash
npm run dev
```

- Sign up at `/signup` → should land in the dashboard.
- Log out, log back in at `/login`.
- `/auth/forgot-password` → email arrives (if SMTP configured).
- Log in as admin → `/admin` loads.
- Add a job source in `/admin/jobs/sources` (status **active**,
  auto-fetch **on**) so the twice-daily cron has something to fetch.

Health check — the single fastest way to confirm the deployment is wired up:

```bash
curl -s https://yourdomain.com/api/health
```

`200` with `"status":"healthy"` means the app reached the database. `503` with
`"failing":["database"]` means the `MYSQL_*` variables are missing or wrong on
the host. **This failure is easy to miss from the browser**: job pages fall back
to a bundled JSON snapshot and keep rendering normally, while signup, login,
admin, and ingestion are all dead.

Cron check:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/fetch-jobs
```

---

## 7a. Schedule the cron jobs (Hostinger does not read `vercel.json`)

`vercel.json` crons are a **Vercel-only** feature. On Hostinger nothing calls
the `/api/cron/*` endpoints, so job listings never refresh and expired listings
are never swept — the board silently goes stale.

hPanel → **Advanced → Cron Jobs**, add three entries pointing at
[`scripts/run-cron.sh`](./run-cron.sh):

| Schedule | Command |
|---|---|
| `0 3 * * *` | `/bin/sh /home/USER/app/scripts/run-cron.sh fetch-jobs` |
| `30 12 * * *` | `/bin/sh /home/USER/app/scripts/run-cron.sh fetch-jobs` |
| `0 1 * * *` | `/bin/sh /home/USER/app/scripts/run-cron.sh expire-jobs` |

Replace `/home/USER/app` with the real deployment path. The script needs
`SITE_URL` and `CRON_SECRET` in its environment; if hPanel cron entries do not
inherit the Node.js environment variables, prefix them inline:

```
0 3 * * * SITE_URL=https://yourdomain.com CRON_SECRET=xxx /bin/sh /home/USER/app/scripts/run-cron.sh fetch-jobs
```

Confirm it ran by checking that `last_fetched_at` advanced in
`/admin/jobs/sources`.

SEO check — run against the **live** site after every rebuild. Both must show
your real origin, never `vercel.app` or `localhost`:

```bash
curl -s https://yourdomain.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://yourdomain.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' | head -3
curl -sI https://yourdomain.com/robots.txt | grep -i x-frame-options   # must print
```

---

## What changed in the code

| Area | Before | Now |
|---|---|---|
| Queries | supabase-js | `src/lib/db/mysql.ts` — same builder API over MySQL |
| Auth | Supabase Auth | `src/lib/db/auth.ts` — bcrypt + JWT cookie sessions |
| Session check | Supabase cookie | `src/lib/auth/session-token.ts` (Edge-safe) |
| Browser auth | Supabase JS | `/api/auth/*` route handlers |
| Resume files | Storage bucket | `resume_files` table (MEDIUMBLOB) |
| Password reset | Supabase email | Hostinger SMTP + `auth_tokens` table |

Existing call sites were left untouched: `@/lib/supabase/server` and
`@/lib/supabase/admin` keep their names and shapes, so all ~236 queries work
unchanged against MySQL.
