import "server-only";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { createMysqlDataClient } from "@/lib/db/mysql";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
  type AuthRole,
} from "@/lib/auth/session-token";

/**
 * MySQL-backed replacement for Supabase Auth, exposing the same result
 * shapes the app already consumes ({ data: { user }, error }).
 *
 * Sessions are stateless JWTs (HS256, `jose`) in an httpOnly cookie. The
 * user's role is embedded in the token so the middleware can authorize
 * routes without a database round-trip; role/ban changes apply on next
 * sign-in, and server pages that need live state still read the DB.
 */

export { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken };
export type { AuthRole };

export interface AuthUser {
  id: string;
  email: string;
  phone?: string | null;
  app_metadata: { role?: AuthRole; [key: string]: unknown };
  user_metadata: { role?: AuthRole; full_name?: string; name?: string; [key: string]: unknown };
  banned_until?: string;
}

export type AuthError = { message: string; code?: string; status?: number };

export function toAuthUser(row: {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  is_banned?: boolean | null;
  app_metadata?: Record<string, unknown> | null;
}): AuthUser {
  const role = (row.role ?? "candidate") as AuthRole;
  return {
    id: row.id,
    email: row.email,
    app_metadata: { ...(row.app_metadata ?? {}), role },
    user_metadata: { role, full_name: row.name ?? undefined },
    ...(row.is_banned ? { banned_until: "infinity" } : {}),
  };
}

export async function getAuthUserFromToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return {
    id: session.id,
    email: session.email,
    app_metadata: { role: session.role },
    user_metadata: { role: session.role },
  };
}

export async function signInWithPasswordCore(email: string, password: string) {
  const db = createMysqlDataClient();
  const { data, error } = await db
    .from("users")
    .select("id, name, email, role, is_banned, password_hash, app_metadata")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    return { user: null, token: null, error: { message: error.message } as AuthError };
  }

  const row = data as
    | { id: string; name: string; email: string; role: AuthRole; is_banned: boolean; password_hash: string | null; app_metadata: Record<string, unknown> | null }
    | null;

  if (!row || !row.password_hash) {
    return { user: null, token: null, error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 } };
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return { user: null, token: null, error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 } };
  }

  if (row.is_banned) {
    return { user: null, token: null, error: { message: "This account has been suspended.", code: "user_banned", status: 403 } };
  }

  const token = await createSessionToken({ id: row.id, email: row.email, role: row.role });
  return { user: toAuthUser(row), token, error: null };
}

export async function signUpCore(input: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: AuthRole;
}) {
  const db = createMysqlDataClient();
  const email = input.email.trim().toLowerCase();
  const role: AuthRole = input.role === "employer" ? "employer" : "candidate";

  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { user: null, token: null, error: { message: lookupError.message } as AuthError };
  }

  if (existing) {
    return { user: null, token: null, error: { message: "User already registered", code: "user_already_exists", status: 422 } };
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const { error: insertError } = await db.from("users").insert({
    id,
    name: input.fullName ?? email.split("@")[0],
    email,
    phone: input.phone ?? null,
    role,
    password_hash: passwordHash,
    email_verified: true,
    app_metadata: { role },
  });

  if (insertError) {
    const message = insertError.code === "23505" ? "User already registered" : insertError.message;
    return { user: null, token: null, error: { message } as AuthError };
  }

  const token = await createSessionToken({ id, email, role });
  return {
    user: toAuthUser({ id, email, name: input.fullName, role }),
    token,
    error: null,
  };
}

export async function updatePasswordCore(userId: string, newPassword: string) {
  const db = createMysqlDataClient();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error } = await db.from("users").update({ password_hash: passwordHash }).eq("id", userId);
  return { error: error ? ({ message: error.message } as AuthError) : null };
}

/** supabase-js `auth.admin` compatible helpers backed by the users table. */
export function createAuthAdminApi() {
  const db = createMysqlDataClient();

  return {
    async getUserById(userId: string) {
      const { data, error } = await db
        .from("users")
        .select("id, name, email, role, is_banned, app_metadata")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        return { data: { user: null }, error: { message: error?.message ?? "User not found" } };
      }

      return { data: { user: toAuthUser(data as Parameters<typeof toAuthUser>[0]) }, error: null };
    },

    async updateUserById(
      userId: string,
      attributes: { app_metadata?: Record<string, unknown>; ban_duration?: string; password?: string },
    ) {
      const updates: Record<string, unknown> = {};

      if (attributes.app_metadata) {
        updates.app_metadata = attributes.app_metadata;
        if (typeof attributes.app_metadata.role === "string") {
          updates.role = attributes.app_metadata.role;
        }
        if (typeof attributes.app_metadata.banned === "boolean") {
          updates.is_banned = attributes.app_metadata.banned;
        }
      }
      if (attributes.ban_duration) {
        updates.is_banned = attributes.ban_duration !== "none";
      }
      if (attributes.password) {
        updates.password_hash = await bcrypt.hash(attributes.password, 10);
      }

      if (Object.keys(updates).length === 0) {
        return { data: { user: null }, error: null };
      }

      const { error } = await db.from("users").update(updates).eq("id", userId);
      if (error) {
        return { data: { user: null }, error: { message: error.message } };
      }
      return this.getUserById(userId);
    },

    async listUsers(options?: { page?: number; perPage?: number }) {
      const page = Math.max(1, options?.page ?? 1);
      const perPage = Math.max(1, options?.perPage ?? 50);
      const from = (page - 1) * perPage;

      const { data, error, count } = await db
        .from("users")
        .select("id, name, email, role, is_banned, app_metadata, created_at, last_seen_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + perPage - 1);

      if (error) {
        return { data: { users: [], aud: "" }, error: { message: error.message } };
      }

      const rows = (data ?? []) as Array<Parameters<typeof toAuthUser>[0] & { created_at?: string; last_seen_at?: string }>;
      const users = rows.map((row) => ({
        ...toAuthUser(row),
        created_at: row.created_at,
        last_sign_in_at: row.last_seen_at,
      }));

      const total = count ?? users.length;
      return {
        data: {
          users,
          aud: "authenticated",
          total,
          nextPage: from + perPage < total ? page + 1 : null,
          lastPage: Math.ceil(total / perPage),
        },
        error: null,
      };
    },
  };
}
