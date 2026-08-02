/**
 * Shared MySQL helper for the maintenance scripts in scripts/.
 *
 * Provides a connection plus a small subset of the query-builder API the
 * scripts were written against (select/insert/upsert/update/delete with
 * eq/in/order/limit), so porting them from the previous provider stays a
 * mechanical change.
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

export function loadEnvFiles(files = [".env.local", ".env"]) {
  for (const file of files) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

export async function connect() {
  const { MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD } = process.env;

  if (!MYSQL_HOST || !MYSQL_DATABASE || !MYSQL_USER || !MYSQL_PASSWORD) {
    console.error(
      "Missing database configuration. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER and MYSQL_PASSWORD (see .env.example).",
    );
    process.exit(1);
  }

  return mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT ?? 3306),
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    timezone: "Z",
    charset: "utf8mb4",
  });
}

const JSON_COLUMNS = new Set([
  "app_metadata",
  "skills",
  "preferred_roles",
  "preferred_job_types",
  "responsibilities",
  "requirements",
  "suspicious_flags",
  "config",
  "meta",
  "metadata",
  "notes",
  "event_data",
  "content_json",
  "missing_keywords",
  "suggestions",
  "questions_json",
  "answers_json",
  "report_json",
  "keywords",
  "faq_json",
  "faq",
  "important_dates",
  "raw_data_json",
  "raw_payload",
  "normalized_payload",
  "enrichment_payload",
  "matching_skills",
  "missing_skills",
]);

function serialize(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 23).replace("T", " ");
  }
  return value;
}

function parseRow(row) {
  for (const [key, value] of Object.entries(row)) {
    if (JSON_COLUMNS.has(key) && typeof value === "string" && value.length > 0) {
      try {
        row[key] = JSON.parse(value);
      } catch {
        // leave as-is
      }
    }
  }
  return row;
}

const q = (name) => "`" + String(name).replace(/`/g, "") + "`";

class Query {
  constructor(connection, table) {
    this.connection = connection;
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.mode = { type: "select", columns: "*" };
    this.wantSingle = false;
  }

  select(columns = "*") {
    if (this.mode.type === "select") this.mode = { type: "select", columns };
    return this;
  }

  insert(rows) {
    this.mode = { type: "insert", rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }

  upsert(rows, options = {}) {
    this.mode = { type: "upsert", rows: Array.isArray(rows) ? rows : [rows], onConflict: options.onConflict };
    return this;
  }

  update(values) {
    this.mode = { type: "update", values };
    return this;
  }

  delete() {
    this.mode = { type: "delete" };
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, op: "=", value });
    return this;
  }

  in(column, values) {
    this.filters.push({ column, op: "IN", value: values });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  buildWhere(params) {
    if (this.filters.length === 0) return "";
    const clauses = this.filters.map((filter) => {
      if (filter.op === "IN") {
        if (filter.value.length === 0) return "1 = 0";
        params.push(...filter.value.map(serialize));
        return `${q(filter.column)} IN (${filter.value.map(() => "?").join(", ")})`;
      }
      if (filter.value === null) return `${q(filter.column)} IS NULL`;
      params.push(serialize(filter.value));
      return `${q(filter.column)} = ?`;
    });
    return ` WHERE ${clauses.join(" AND ")}`;
  }

  async then(resolve, reject) {
    try {
      resolve(await this.run());
    } catch (error) {
      if (reject) reject(error);
      else throw error;
    }
  }

  async run() {
    try {
      const params = [];
      const where = this.buildWhere(params);

      if (this.mode.type === "select") {
        const projection =
          this.mode.columns.trim() === "*"
            ? "*"
            : this.mode.columns
                .split(",")
                .map((c) => q(c.trim()))
                .join(", ");

        let sql = `SELECT ${projection} FROM ${q(this.table)}${where}`;
        if (this.orders.length > 0) {
          sql += ` ORDER BY ${this.orders.map((o) => `${q(o.column)} ${o.ascending ? "ASC" : "DESC"}`).join(", ")}`;
        }
        if (this.limitCount !== null) sql += ` LIMIT ${Number(this.limitCount)}`;
        else if (this.wantSingle) sql += " LIMIT 1";

        const [rows] = await this.connection.query(sql, params);
        const parsed = rows.map(parseRow);
        return { data: this.wantSingle ? (parsed[0] ?? null) : parsed, error: null };
      }

      if (this.mode.type === "insert" || this.mode.type === "upsert") {
        const rows = this.mode.rows.map((row) => ({ ...row, id: row.id ?? randomUUID() }));
        if (rows.length === 0) return { data: [], error: null };

        const columns = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
        const values = [];
        for (const row of rows) for (const col of columns) values.push(serialize(row[col]));

        let sql = `INSERT INTO ${q(this.table)} (${columns.map(q).join(", ")}) VALUES ${rows
          .map(() => `(${columns.map(() => "?").join(", ")})`)
          .join(", ")}`;

        if (this.mode.type === "upsert") {
          const conflict = (this.mode.onConflict ?? "id").split(",").map((c) => c.trim());
          const updatable = columns.filter((c) => !conflict.includes(c) && c !== "created_at");
          sql += ` ON DUPLICATE KEY UPDATE ${
            updatable.length > 0
              ? updatable.map((c) => `${q(c)} = VALUES(${q(c)})`).join(", ")
              : `${q("id")} = ${q("id")}`
          }`;
        }

        await this.connection.query(sql, values);
        return { data: this.wantSingle ? rows[0] : rows, error: null };
      }

      if (this.mode.type === "update") {
        const entries = Object.entries(this.mode.values).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return { data: null, error: null };
        const setParams = entries.map(([, v]) => serialize(v));
        const sql = `UPDATE ${q(this.table)} SET ${entries.map(([k]) => `${q(k)} = ?`).join(", ")}${where}`;
        await this.connection.query(sql, [...setParams, ...params]);
        return { data: null, error: null };
      }

      await this.connection.query(`DELETE FROM ${q(this.table)}${where}`, params);
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
  }
}

/** Returns a `{ from(table) }` client over an open connection. */
export function createDb(connection) {
  return { from: (table) => new Query(connection, table) };
}

export { randomUUID };
