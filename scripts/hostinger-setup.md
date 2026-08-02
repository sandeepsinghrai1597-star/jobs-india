# Hostinger setup — JobPulse India

The app now runs on **Hostinger MySQL** instead of Supabase. Auth, sessions,
password reset, resume file storage, and job ingestion are all backed by your
own database.

> **Important:** a Hostinger *web hosting* plan can host the database, email,
> and domain — but it cannot run a Next.js server. The site itself must stay on
> a Node host (Vercel is already connected and free). Your Hostinger domain can
> point at it, so visitors only ever see your domain.

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

Push the same variables to the host running the site:

```bash
npx vercel env add MYSQL_HOST production      # repeat per variable
npx vercel --prod
```

Variables needed in production: all `MYSQL_*`, `AUTH_JWT_SECRET`, all `SMTP_*`,
plus the existing `CRON_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, Razorpay keys,
and `NEXT_PUBLIC_SITE_URL`.

The old `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` variables are
no longer read and can be deleted.

---

## 6. Point your Hostinger domain at the site

hPanel → **Domains → DNS Zone**, then either:

- **Subdomain-free apex:** add an `A` record `@ → 76.76.21.21`, and a `CNAME`
  `www → cname.vercel-dns.com`; or
- follow the exact records Vercel shows under Project → Settings → Domains
  after you add your domain there.

Then set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` and redeploy.

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

Cron check:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/fetch-jobs
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
