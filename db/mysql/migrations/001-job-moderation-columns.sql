-- Adds the `jobs` columns the admin moderation and ingestion code has always
-- written but which were missing from the initial MySQL schema.
--
-- Without these, `approveJobAction`, `rejectJobAction`, admin job creation, and
-- the scheduled auto-publish in `src/server/job-fetcher/publisher.ts` all fail
-- with "Unknown column '<name>' in 'INSERT INTO'" / 'FIELD LIST'.
--
-- Safe to re-run: each statement is guarded so an already-migrated database is
-- left untouched. Apply with:
--   node scripts/apply-migrations.mjs
-- or by pasting this file into hPanel -> phpMyAdmin -> SQL.
--
-- MySQL 8 has no "ADD COLUMN IF NOT EXISTS" (MariaDB does), so each column is
-- added through a prepared statement gated on information_schema. Every
-- statement here is a plain top-level statement terminated by `;` -- no stored
-- procedure, no BEGIN/END. phpMyAdmin and the mysql CLI split pasted SQL on
-- semicolons without parsing it, so a compound procedure body gets cut at its
-- first inner `;` and fails with "#1064 ... near '' at line 13".

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'reviewed_at') > 0,
  'SELECT 1', 'ALTER TABLE `jobs` ADD COLUMN `reviewed_at` DATETIME(3) NULL');
PREPARE jp_stmt FROM @ddl;
EXECUTE jp_stmt;
DEALLOCATE PREPARE jp_stmt;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'reviewed_by') > 0,
  'SELECT 1', 'ALTER TABLE `jobs` ADD COLUMN `reviewed_by` CHAR(36) NULL');
PREPARE jp_stmt FROM @ddl;
EXECUTE jp_stmt;
DEALLOCATE PREPARE jp_stmt;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'rejected_at') > 0,
  'SELECT 1', 'ALTER TABLE `jobs` ADD COLUMN `rejected_at` DATETIME(3) NULL');
PREPARE jp_stmt FROM @ddl;
EXECUTE jp_stmt;
DEALLOCATE PREPARE jp_stmt;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'import_source') > 0,
  'SELECT 1', 'ALTER TABLE `jobs` ADD COLUMN `import_source` VARCHAR(64) NULL');
PREPARE jp_stmt FROM @ddl;
EXECUTE jp_stmt;
DEALLOCATE PREPARE jp_stmt;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'import_batch_id') > 0,
  'SELECT 1', 'ALTER TABLE `jobs` ADD COLUMN `import_batch_id` CHAR(36) NULL');
PREPARE jp_stmt FROM @ddl;
EXECUTE jp_stmt;
DEALLOCATE PREPARE jp_stmt;

-- `JSON NOT NULL` with no default rejects any INSERT that omits the column.
-- Admin job creation, the scheduled auto-publish, and the apply flow's bare
-- candidate-profile insert all do exactly that, failing with
-- "CONSTRAINT `<table>.<column>` failed". Defaulting to an empty array keeps
-- every insert path valid. MODIFY is naturally idempotent.
ALTER TABLE jobs
  MODIFY responsibilities JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY requirements JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY skills JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY suspicious_flags JSON NOT NULL DEFAULT (JSON_ARRAY());

ALTER TABLE candidate_profiles
  MODIFY skills JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY preferred_roles JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY preferred_job_types JSON NOT NULL DEFAULT (JSON_ARRAY());

ALTER TABLE normalized_jobs
  MODIFY responsibilities JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY requirements JSON NOT NULL DEFAULT (JSON_ARRAY()),
  MODIFY skills JSON NOT NULL DEFAULT (JSON_ARRAY());
