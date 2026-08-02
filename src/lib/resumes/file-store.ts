import "server-only";
import { randomUUID } from "crypto";
import { getMysqlPool } from "@/lib/db/mysql";

/**
 * Resume file storage backed by MySQL (`resume_files.content`, MEDIUMBLOB),
 * replacing the object-storage bucket used before the Hostinger migration.
 * Uploads are capped at 5 MB by the API, so blob storage is a reasonable fit
 * and keeps files inside the single managed database.
 *
 * Raw pool queries are used here rather than the query builder because the
 * builder serializes values for JSON/text columns and would corrupt binary
 * payloads.
 */

export interface StoredResumeFile {
  storagePath: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  content: Buffer;
}

export async function saveResumeFile(input: {
  storagePath: string;
  userId: string;
  fileName: string;
  contentType: string;
  content: Buffer;
}): Promise<{ error: string | null }> {
  const pool = getMysqlPool();
  if (!pool) return { error: "Database is not configured." };

  try {
    await pool.query(
      `INSERT INTO resume_files (id, storage_path, user_id, file_name, content_type, byte_size, content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.storagePath,
        input.userId,
        input.fileName,
        input.contentType,
        input.content.byteLength,
        input.content,
      ],
    );
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store the file." };
  }
}

export async function loadResumeFile(storagePath: string): Promise<StoredResumeFile | null> {
  const pool = getMysqlPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.query(
      `SELECT storage_path, file_name, content_type, byte_size, content
       FROM resume_files WHERE storage_path = ? LIMIT 1`,
      [storagePath],
    );

    const row = (rows as Array<{
      storage_path: string;
      file_name: string;
      content_type: string;
      byte_size: number;
      content: Buffer;
    }>)[0];

    if (!row) return null;

    return {
      storagePath: row.storage_path,
      fileName: row.file_name,
      contentType: row.content_type,
      byteSize: row.byte_size,
      content: row.content,
    };
  } catch {
    return null;
  }
}

export async function deleteResumeFile(storagePath: string) {
  const pool = getMysqlPool();
  if (!pool) return;
  try {
    await pool.query(`DELETE FROM resume_files WHERE storage_path = ?`, [storagePath]);
  } catch {
    // best-effort cleanup
  }
}
