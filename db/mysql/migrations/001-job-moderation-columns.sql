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
--
-- MySQL/MariaDB has no "ADD COLUMN IF NOT EXISTS" that works across both, so
-- each column is added through a prepared statement gated on information_schema.

DROP PROCEDURE IF EXISTS jp_add_column;

CREATE PROCEDURE jp_add_column(
  IN target_table VARCHAR(64),
  IN target_column VARCHAR(64),
  IN column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = target_table
      AND column_name = target_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', target_table, '` ADD COLUMN `', target_column, '` ', column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

CALL jp_add_column('jobs', 'reviewed_at', 'DATETIME(3) NULL');
CALL jp_add_column('jobs', 'reviewed_by', 'CHAR(36) NULL');
CALL jp_add_column('jobs', 'rejected_at', 'DATETIME(3) NULL');
CALL jp_add_column('jobs', 'import_source', 'VARCHAR(64) NULL');
CALL jp_add_column('jobs', 'import_batch_id', 'CHAR(36) NULL');

DROP PROCEDURE IF EXISTS jp_add_column;

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
