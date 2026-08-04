-- `resumes.content_json` is `JSON NOT NULL` with no default, so any INSERT that
-- omits it is rejected with "CONSTRAINT `resumes.content_json` failed" — the
-- same class of bug 001 fixed for jobs/candidate_profiles/normalized_jobs.
--
-- The resume *builder* always sends content_json, so this only bites the upload
-- path: POST /api/resumes/upload stores the file, then fails to create the
-- library row and returns 500 ("Your resume uploaded, but we could not save it
-- to your library"), which blocks applying to a job with a fresh resume.
--
-- An uploaded PDF/DOC has no structured document body, so an empty object is
-- the right default. MODIFY is naturally idempotent.
--
-- Apply with: node scripts/apply-migrations.mjs

ALTER TABLE resumes
  MODIFY content_json JSON NOT NULL DEFAULT (JSON_OBJECT());
