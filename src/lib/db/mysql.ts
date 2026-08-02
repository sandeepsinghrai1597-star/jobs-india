import "server-only";
import { randomUUID } from "crypto";
import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

/**
 * Supabase-compatible query layer over Hostinger MySQL/MariaDB.
 *
 * Implements the subset of the supabase-js PostgREST builder that this
 * codebase actually uses (verified by audit): select/insert/update/delete/
 * upsert, eq/neq/in/not/or/ilike filters, order/limit/range modifiers,
 * single/maybeSingle, and exact counts. Postgres arrays and jsonb map to
 * MySQL JSON columns, serialized on write and parsed on read (MariaDB
 * returns JSON as text, so parsing is driven by the column map below).
 */

export type DbError = { message: string; code?: string; details?: string };

/**
 * `data` is intentionally `any`: the app was written against an untyped
 * supabase-js client, so ~236 call sites destructure row fields directly and
 * cast to their own row interfaces. Narrowing it here would break all of them
 * without adding real safety.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbResult<T = any> = { data: T; error: DbError | null; count: number | null; status?: number };

/** A result row with unconstrained columns — annotate `.map`/`.filter` callbacks with this. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>;

// JSON-typed columns per table (from db/mysql/schema.sql). Needed because
// MariaDB serves JSON as LONGTEXT, so driver-level detection is unreliable.
const JSON_COLUMNS: Record<string, string[]> = {
  users: ["app_metadata"],
  candidate_profiles: ["skills", "preferred_roles", "preferred_job_types"],
  jobs: ["responsibilities", "requirements", "skills", "suspicious_flags"],
  job_sources: ["config"],
  job_fetch_runs: ["meta"],
  job_ingestion_items: ["responsibilities", "requirements", "skills", "raw_payload", "normalized_payload", "enrichment_payload"],
  raw_fetched_jobs: ["raw_data_json"],
  normalized_jobs: ["responsibilities", "requirements", "skills"],
  job_match_scores: ["matching_skills", "missing_skills"],
  resumes: ["content_json"],
  resume_analyses: ["missing_keywords", "suggestions"],
  interview_sessions: ["questions_json", "answers_json", "report_json"],
  whatsapp_subscriptions: ["metadata"],
  government_jobs: ["metadata"],
  jobpulse_import_jobs: ["important_dates", "faq", "metadata"],
  internships: ["skills"],
  blog_posts: ["keywords"],
  seo_pages: ["faq_json"],
  payments: ["notes"],
  notifications: ["metadata"],
  analytics_events: ["event_data"],
  admin_logs: ["metadata"],
};

let pool: Pool | null = null;

export function getMysqlPool(): Pool | null {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const database = process.env.MYSQL_DATABASE;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;

  if (!host || !database || !user || !password) {
    return null;
  }

  const options: PoolOptions = {
    host,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database,
    user,
    password,
    // Hostinger shared MySQL caps concurrent connections per user; keep the
    // serverless pool tiny so parallel invocations don't exhaust the limit.
    connectionLimit: Number(process.env.MYSQL_POOL_LIMIT ?? 3),
    timezone: "Z",
    charset: "utf8mb4",
    dateStrings: false,
    typeCast(field, next) {
      if (field.type === "TINY" && field.length === 1) {
        const value = field.string();
        return value === null ? null : value === "1";
      }
      if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
        const value = field.string();
        if (value === null) return null;
        return new Date(value.replace(" ", "T") + "Z").toISOString();
      }
      if (field.type === "DATE") {
        return field.string();
      }
      return next();
    },
  };

  pool = mysql.createPool(options);
  return pool;
}

function quoteIdent(name: string) {
  return "`" + name.replace(/`/g, "") + "`";
}

function serializeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value instanceof Date) return value.toISOString().slice(0, 23).replace("T", " ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    // ISO timestamps → MySQL DATETIME literal (UTC)
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 23).replace("T", " ");
    }
  }
  return value;
}

function parseRow(table: string, row: Record<string, unknown>) {
  const jsonCols = JSON_COLUMNS[table];
  if (!jsonCols) return row;
  for (const col of jsonCols) {
    const value = row[col];
    if (typeof value === "string" && value.length > 0) {
      try {
        row[col] = JSON.parse(value);
      } catch {
        // leave as-is
      }
    }
  }
  return row;
}

type Filter =
  | { kind: "eq" | "neq" | "ilike" | "lt" | "lte" | "gt" | "gte"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "not"; column: string; op: string; value: unknown }
  | { kind: "or"; raw: string };

type Order = { column: string; ascending: boolean; nullsFirst?: boolean };

type Mode =
  | { type: "select"; columns: string; count?: "exact" | null; head?: boolean }
  | { type: "insert"; rows: Record<string, unknown>[] }
  | { type: "upsert"; rows: Record<string, unknown>[]; onConflict?: string }
  | { type: "update"; values: Record<string, unknown> }
  | { type: "delete" };

const OR_SEGMENT = /^([a-zA-Z0-9_]+)\.(eq|ilike|is)\.(.*)$/;

/**
 * Foreign-key column on the parent table for each embeddable relation, used
 * when a select embeds a related table without naming the column explicitly
 * (e.g. `candidate_profiles(full_name)` joins on `candidate_id`).
 */
const EMBED_FOREIGN_KEYS: Record<string, string> = {
  jobs: "job_id",
  users: "user_id",
  candidate_profiles: "candidate_id",
  employer_profiles: "employer_id",
  companies: "company_id",
  resumes: "resume_id",
  job_sources: "source_id",
  payments: "payment_id",
};

interface EmbeddedSelect {
  /** Output key on the parent row. */
  key: string;
  table: string;
  foreignKey: string;
  inner: boolean;
  columns: string[];
  alias: string;
}

interface ParsedSelect {
  baseColumns: string[];
  embeds: EmbeddedSelect[];
}

/**
 * Parses a PostgREST-style select list, including embedded resources:
 *   "id, status, jobs:job_id (title), users!payments_user_id_fkey(email)"
 * Only to-one embeds are supported, which is all this codebase uses.
 */
export function parseSelectColumns(input: string): ParsedSelect {
  const baseColumns: string[] = [];
  const embeds: EmbeddedSelect[] = [];

  let buffer = "";
  let depth = 0;
  const segments: string[] = [];

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      segments.push(buffer);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer.trim()) segments.push(buffer);

  let embedIndex = 0;

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    const openParen = segment.indexOf("(");
    if (openParen === -1) {
      baseColumns.push(segment);
      continue;
    }

    const head = segment.slice(0, openParen).trim();
    const body = segment.slice(openParen + 1, segment.lastIndexOf(")"));

    // head forms: "jobs", "jobs:job_id", "jobs!inner", "users!payments_user_id_fkey"
    let key = head;
    let foreignKey: string | null = null;
    let inner = false;

    const bangIndex = head.indexOf("!");
    if (bangIndex !== -1) {
      key = head.slice(0, bangIndex).trim();
      const hint = head.slice(bangIndex + 1).trim();
      if (hint === "inner") {
        inner = true;
      } else {
        // Constraint name: "{table}_{column}_fkey"
        const match = hint.match(/^[a-z0-9_]+?_([a-z0-9_]+)_fkey$/);
        if (match?.[1]) foreignKey = match[1];
      }
    }

    const colonIndex = key.indexOf(":");
    if (colonIndex !== -1) {
      foreignKey = key.slice(colonIndex + 1).trim();
      key = key.slice(0, colonIndex).trim();
    }

    const table = key;
    embedIndex += 1;

    embeds.push({
      key,
      table,
      foreignKey: foreignKey ?? EMBED_FOREIGN_KEYS[table] ?? `${table.replace(/s$/, "")}_id`,
      inner,
      alias: `e${embedIndex}`,
      columns: body
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    });
  }

  return { baseColumns, embeds };
}

export class MysqlQueryBuilder implements PromiseLike<DbResult> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private singleMode = false;
  private maybeSingleMode = false;
  private returning: string | null = null;
  private activeEmbeds: EmbeddedSelect[] = [];

  constructor(
    private readonly table: string,
    private mode: Mode = { type: "select", columns: "*" },
  ) {}

  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    // `.select()` chained after a write (e.g. `.update(...).select("id")`)
    // asks for the affected rows back — it must not turn the write into a
    // read, which would silently skip the mutation.
    if (this.mode.type !== "select") {
      this.returning = columns;
      return this;
    }

    this.mode = {
      type: "select",
      columns,
      count: options?.count ? "exact" : null,
      head: options?.head ?? false,
    };
    return this;
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = { type: "insert", rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }

  upsert(rows: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.mode = { type: "upsert", rows: Array.isArray(rows) ? rows : [rows], onConflict: options?.onConflict };
    return this;
  }

  update(values: Record<string, unknown>) {
    this.mode = { type: "update", values };
    return this;
  }

  delete() {
    this.mode = { type: "delete" };
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ kind: "not", column, op, value });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ kind: "ilike", column, value: pattern });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ kind: "lt", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ kind: "lte", column, value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ kind: "gt", column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ kind: "gte", column, value });
    return this;
  }

  or(raw: string) {
    this.filters.push({ kind: "or", raw });
    return this;
  }

  is(column: string, value: null | boolean) {
    this.filters.push({ kind: "not", column, op: value === null ? "is-null" : "is", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  /**
   * Resolves a filter/order column to SQL. When a select embeds related
   * tables the query is joined and aliased, so bare columns are qualified
   * with the base alias and dotted paths ("jobs.employer_id") resolve to the
   * matching embed alias. Without embeds the column is emitted unqualified.
   */
  private resolveColumn(column: string): string {
    if (this.activeEmbeds.length === 0) {
      return quoteIdent(column);
    }

    const dotIndex = column.indexOf(".");
    if (dotIndex === -1) {
      return `${BASE_ALIAS}.${quoteIdent(column)}`;
    }

    const prefix = column.slice(0, dotIndex);
    const rest = column.slice(dotIndex + 1);
    const embed = this.activeEmbeds.find((candidate) => candidate.key === prefix);

    if (!embed) {
      return `${BASE_ALIAS}.${quoteIdent(column)}`;
    }

    return `${embed.alias}.${quoteIdent(rest)}`;
  }

  private buildWhere(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const clauses: string[] = [];

    for (const filter of this.filters) {
      if (filter.kind === "eq") {
        if (filter.value === null) {
          clauses.push(`${this.resolveColumn(filter.column)} IS NULL`);
        } else {
          clauses.push(`${this.resolveColumn(filter.column)} = ?`);
          params.push(serializeValue(filter.value));
        }
      } else if (filter.kind === "neq") {
        if (filter.value === null) {
          clauses.push(`${this.resolveColumn(filter.column)} IS NOT NULL`);
        } else {
          clauses.push(`${this.resolveColumn(filter.column)} <> ?`);
          params.push(serializeValue(filter.value));
        }
      } else if (filter.kind === "ilike") {
        clauses.push(`${this.resolveColumn(filter.column)} LIKE ?`);
        params.push(String(filter.value).replace(/\*/g, "%"));
      } else if (
        filter.kind === "lt" ||
        filter.kind === "lte" ||
        filter.kind === "gt" ||
        filter.kind === "gte"
      ) {
        const operator = { lt: "<", lte: "<=", gt: ">", gte: ">=" }[filter.kind];
        clauses.push(`${this.resolveColumn(filter.column)} ${operator} ?`);
        params.push(serializeValue(filter.value));
      } else if (filter.kind === "in") {
        if (filter.values.length === 0) {
          clauses.push("1 = 0");
        } else {
          clauses.push(`${this.resolveColumn(filter.column)} IN (${filter.values.map(() => "?").join(", ")})`);
          for (const v of filter.values) params.push(serializeValue(v));
        }
      } else if (filter.kind === "not") {
        if (filter.op === "is-null" || (filter.op === "is" && filter.value === null)) {
          clauses.push(`${this.resolveColumn(filter.column)} IS NOT NULL`);
        } else if (filter.op === "is") {
          clauses.push(`${this.resolveColumn(filter.column)} <> ?`);
          params.push(serializeValue(filter.value));
        } else if (filter.op === "eq") {
          clauses.push(`${this.resolveColumn(filter.column)} <> ?`);
          params.push(serializeValue(filter.value));
        } else {
          clauses.push("1 = 1");
        }
      } else if (filter.kind === "or") {
        const parts: string[] = [];
        for (const segment of filter.raw.split(",")) {
          const match = segment.trim().match(OR_SEGMENT);
          if (!match) continue;
          const [, column, op, rawValue] = match;
          if (op === "eq") {
            if (rawValue === "true" || rawValue === "false") {
              parts.push(`${this.resolveColumn(column!)} = ?`);
              params.push(rawValue === "true" ? 1 : 0);
            } else if (rawValue === "null") {
              parts.push(`${this.resolveColumn(column!)} IS NULL`);
            } else {
              parts.push(`${this.resolveColumn(column!)} = ?`);
              params.push(rawValue);
            }
          } else if (op === "ilike") {
            parts.push(`${this.resolveColumn(column!)} LIKE ?`);
            params.push(rawValue!.replace(/\*/g, "%"));
          } else if (op === "is") {
            parts.push(`${this.resolveColumn(column!)} IS ${rawValue === "null" ? "NULL" : rawValue === "true" ? TRUE_SQL : FALSE_SQL}`);
          }
        }
        if (parts.length > 0) {
          clauses.push(`(${parts.join(" OR ")})`);
        }
      }
    }

    return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  }

  private buildOrder(): string {
    if (this.orders.length === 0) return "";
    const parts: string[] = [];
    for (const order of this.orders) {
      const col = this.resolveColumn(order.column);
      // Emulate Postgres null ordering (ASC → NULLS LAST, DESC → NULLS FIRST
      // by default; explicit nullsFirst overrides). MySQL defaults are the
      // exact opposite, so always emit an IS NULL prefix key.
      const nullsFirst = order.nullsFirst ?? !order.ascending;
      parts.push(`(${col} IS NULL) ${nullsFirst ? "DESC" : "ASC"}, ${col} ${order.ascending ? "ASC" : "DESC"}`);
    }
    return ` ORDER BY ${parts.join(", ")}`;
  }

  private buildSelectColumns(baseColumns: string[]): string {
    if (baseColumns.length === 0 || baseColumns[0] === "*") {
      return this.activeEmbeds.length > 0 ? `${BASE_ALIAS}.*` : "*";
    }

    const prefix = this.activeEmbeds.length > 0 ? `${BASE_ALIAS}.` : "";
    const projected = baseColumns.map((column) => `${prefix}${quoteIdent(column)}`);

    for (const embed of this.activeEmbeds) {
      for (const column of embed.columns) {
        projected.push(
          `${embed.alias}.${quoteIdent(column)} AS ${quoteIdent(`${EMBED_PREFIX}${embed.alias}__${column}`)}`,
        );
      }
    }

    return projected.join(", ");
  }

  private buildFrom(): string {
    const base = `${quoteIdent(this.table)}${this.activeEmbeds.length > 0 ? ` ${BASE_ALIAS}` : ""}`;
    if (this.activeEmbeds.length === 0) return base;

    const joins = this.activeEmbeds.map((embed) => {
      const kind = embed.inner ? "INNER JOIN" : "LEFT JOIN";
      return `${kind} ${quoteIdent(embed.table)} ${embed.alias} ON ${embed.alias}.${quoteIdent("id")} = ${BASE_ALIAS}.${quoteIdent(embed.foreignKey)}`;
    });

    return `${base} ${joins.join(" ")}`;
  }

  /** Splits flat join output back into the nested shape PostgREST returns. */
  private reassembleRow(row: Record<string, unknown>) {
    if (this.activeEmbeds.length === 0) {
      return parseRow(this.table, row);
    }

    const base: Record<string, unknown> = {};
    const embedded = new Map<string, Record<string, unknown>>();

    for (const [key, value] of Object.entries(row)) {
      if (!key.startsWith(EMBED_PREFIX)) {
        base[key] = value;
        continue;
      }

      const [alias, column] = key.slice(EMBED_PREFIX.length).split("__");
      if (!alias || !column) continue;
      if (!embedded.has(alias)) embedded.set(alias, {});
      embedded.get(alias)![column] = value;
    }

    const result = parseRow(this.table, base);

    for (const embed of this.activeEmbeds) {
      const values = embedded.get(embed.alias) ?? {};
      // A LEFT JOIN with no match yields all-null columns — represent that as
      // a null relation, matching PostgREST.
      const isEmpty = Object.values(values).every((value) => value === null);
      result[embed.key] = isEmpty ? null : parseRow(embed.table, values);
    }

    return result;
  }

  /** Reads the rows a write is about to affect, for `.update(...).select(...)`. */
  private async selectAffectedRows(
    dbPool: Pool,
    columns: string,
    where: string,
    whereParams: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const { baseColumns } = parseSelectColumns(columns);
    const projection =
      baseColumns.length === 0 || baseColumns[0] === "*"
        ? "*"
        : baseColumns.map((column) => quoteIdent(column)).join(", ");

    const [rows] = await dbPool.query(
      `SELECT ${projection} FROM ${quoteIdent(this.table)}${where}`,
      whereParams,
    );

    return (rows as Record<string, unknown>[]).map((row) => parseRow(this.table, row));
  }

  private async execute(): Promise<DbResult> {
    const dbPool = getMysqlPool();
    if (!dbPool) {
      return { data: null, error: { message: "MySQL is not configured (missing MYSQL_* env vars)." }, count: null };
    }

    try {
      if (this.mode.type === "select") {
        const { baseColumns, embeds } = parseSelectColumns(this.mode.columns);
        this.activeEmbeds = embeds;

        let count: number | null = null;
        const whereParams: unknown[] = [];
        const where = this.buildWhere(whereParams);
        const from = this.buildFrom();

        if (this.mode.count === "exact") {
          const [countRows] = await dbPool.query(
            `SELECT COUNT(*) AS total FROM ${from}${where}`,
            whereParams,
          );
          count = Number((countRows as Array<{ total: number }>)[0]?.total ?? 0);
        }

        if (this.mode.head) {
          return { data: null, error: null, count, status: 200 };
        }

        let sql = `SELECT ${this.buildSelectColumns(baseColumns)} FROM ${from}${where}${this.buildOrder()}`;
        const params = [...whereParams];
        if (this.limitCount !== null) {
          sql += ` LIMIT ?`;
          params.push(this.limitCount);
          if (this.offsetCount !== null) {
            sql += ` OFFSET ?`;
            params.push(this.offsetCount);
          }
        } else if (this.singleMode || this.maybeSingleMode) {
          sql += ` LIMIT 2`;
        }

        const [rows] = await dbPool.query(sql, params);
        const parsed = (rows as Record<string, unknown>[]).map((row) => this.reassembleRow(row));

        if (this.singleMode || this.maybeSingleMode) {
          if (parsed.length === 0) {
            return this.maybeSingleMode
              ? { data: null, error: null, count }
              : { data: null, error: { message: "No rows found", code: "PGRST116" }, count };
          }
          if (parsed.length > 1) {
            return { data: null, error: { message: "Multiple rows returned", code: "PGRST116" }, count };
          }
          return { data: parsed[0], error: null, count };
        }

        return { data: parsed, error: null, count };
      }

      if (this.mode.type === "insert" || this.mode.type === "upsert") {
        const rows = this.mode.rows.map((row) => {
          const copy: Record<string, unknown> = { ...row };
          if (copy.id === undefined || copy.id === null) copy.id = randomUUID();
          return copy;
        });
        if (rows.length === 0) return { data: null, error: null, count: null };

        const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined))));
        const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
        const params: unknown[] = [];
        for (const row of rows) {
          for (const col of columns) {
            params.push(serializeValue(row[col] === undefined ? null : row[col]));
          }
        }

        let sql = `INSERT INTO ${quoteIdent(this.table)} (${columns.map(quoteIdent).join(", ")}) VALUES ${placeholders}`;
        if (this.mode.type === "upsert") {
          const conflictCols = (this.mode.onConflict ?? "id").split(",").map((c) => c.trim());
          const updatable = columns.filter((c) => !conflictCols.includes(c) && c !== "id" && c !== "created_at");
          if (updatable.length > 0) {
            sql += ` ON DUPLICATE KEY UPDATE ${updatable.map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`).join(", ")}`;
          } else {
            sql += ` ON DUPLICATE KEY UPDATE ${quoteIdent("id")} = ${quoteIdent("id")}`;
          }
        }

        await dbPool.query(sql, params);
        const inserted = rows.map((row) => parseRow(this.table, { ...row }));
        return {
          data: this.singleMode || this.maybeSingleMode ? (inserted[0] ?? null) : inserted,
          error: null,
          count: null,
          status: 201,
        };
      }

      if (this.mode.type === "update") {
        const entries = Object.entries(this.mode.values).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return { data: null, error: null, count: null };
        const params: unknown[] = entries.map(([, v]) => serializeValue(v));
        const whereParams: unknown[] = [];
        const where = this.buildWhere(whereParams);

        // Rows must be captured before the write: an update commonly changes
        // the very column it filters on (e.g. status active → expired), so
        // reading afterwards would return nothing.
        const affected = this.returning
          ? await this.selectAffectedRows(dbPool, this.returning, where, whereParams)
          : null;

        const sql = `UPDATE ${quoteIdent(this.table)} SET ${entries.map(([k]) => `${quoteIdent(k)} = ?`).join(", ")}${where}`;
        await dbPool.query(sql, [...params, ...whereParams]);

        return {
          data: this.returning ? (this.singleMode || this.maybeSingleMode ? (affected?.[0] ?? null) : affected) : null,
          error: null,
          count: null,
          status: 200,
        };
      }

      // delete
      const whereParams: unknown[] = [];
      const where = this.buildWhere(whereParams);
      const removed = this.returning
        ? await this.selectAffectedRows(dbPool, this.returning, where, whereParams)
        : null;
      await dbPool.query(`DELETE FROM ${quoteIdent(this.table)}${where}`, whereParams);
      return {
        data: this.returning ? (this.singleMode || this.maybeSingleMode ? (removed?.[0] ?? null) : removed) : null,
        error: null,
        count: null,
        status: 200,
      };
    } catch (error) {
      const err = error as { message?: string; code?: string };
      const code = err.code === "ER_DUP_ENTRY" ? "23505" : err.code;
      return { data: null, error: { message: err.message ?? "Database error", code }, count: null };
    }
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const TRUE_SQL = "TRUE";
const FALSE_SQL = "FALSE";
const BASE_ALIAS = "t0";
/** Marks join-projected columns so they can be nested back after the query. */
const EMBED_PREFIX = "__emb_";

export function createMysqlDataClient() {
  return {
    from(table: string) {
      return new MysqlQueryBuilder(table);
    },
  };
}

export type MysqlDataClient = ReturnType<typeof createMysqlDataClient>;
