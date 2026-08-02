# Restore the Supabase backend (project is gone)

**Why:** The Supabase project referenced everywhere (`bnkiruczjndzkdbucnos.supabase.co`)
no longer exists (DNS NXDOMAIN). Auth, employer jobs, fetched jobs, dashboards, and the
cron ingestion all fail because of this — locally **and** in production. The public site
only survives on the curated government-jobs fallback.

**What already works:** full schema + migrations live in this repo
(`supabase/migrations/`, `supabase/schema.sql`, `supabase/seed.sql`), so rebuilding is
mechanical once a new project exists.

## Steps (~10 minutes)

1. **Create a new project** at https://supabase.com/dashboard (region: `ap-south-1`
   Mumbai recommended). Note the database password you choose.

2. **Log in the CLI and link** (run from the repo root):

   ```bash
   npx supabase login
   npx supabase link --project-ref <NEW_PROJECT_REF>
   ```

3. **Push the schema and seed data:**

   ```bash
   npx supabase db push          # applies supabase/migrations/*
   # then load seed data via the SQL editor or:
   npx supabase db execute --file supabase/seed.sql
   ```

4. **Update local `.env`** — replace these with values from
   Project Settings → API in the new project:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   (same as anon key if not shown)
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_DATABASE_PASSWORD=...
   ```

5. **Update Vercel envs** (the old values cannot be pulled — they were stored as
   sensitive). For each var above run:

   ```bash
   npx vercel env rm <NAME> production
   npx vercel env add <NAME> production
   ```

   (`CRON_SECRET` is already set — do not touch it.)

6. **Redeploy:** `npx vercel redeploy jobpulse-india.vercel.app` (or push to main).

7. **Re-create job sources** in the admin (`/admin/jobs/sources`) with
   `status=active` + `allow_auto_fetch=true`, or run the seeder scripts in `scripts/`.
   The cron (`0 3 * * *` and `30 12 * * *` UTC in `vercel.json`) then auto-fetches and
   quality-gated listings auto-publish (`JOB_FETCH_AUTO_PUBLISH`, default on).

## Verify

```bash
node --env-file=.env scripts/seed-jobs.mjs        # should connect without ENOTFOUND
curl -H "Authorization: Bearer $CRON_SECRET" https://jobpulse-india.vercel.app/api/cron/fetch-jobs
```
