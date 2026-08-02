import "server-only";
import { cookies } from "next/headers";
import { createMysqlDataClient, MysqlQueryBuilder } from "@/lib/db/mysql";
import {
  SESSION_COOKIE,
  createAuthAdminApi,
  getAuthUserFromToken,
  signInWithPasswordCore,
  signUpCore,
  sessionCookieOptions,
  type AuthUser,
} from "@/lib/db/auth";

/**
 * Server-side data + auth client shaped like the supabase-js client the app
 * was written against, so existing call sites keep working:
 *   client.from("jobs").select(...)      → MySQL
 *   client.auth.getUser()                → session cookie (JWT)
 *   client.auth.admin.*                  → users table
 */

export interface ServerDataClient {
  from(table: string): MysqlQueryBuilder;
  auth: {
    getUser(): Promise<{ data: { user: AuthUser | null }; error: { message: string } | null }>;
    getSession(): Promise<{ data: { session: { user: AuthUser } | null }; error: null }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { user: AuthUser | null; session: { user: AuthUser } | null };
      error: { message: string; code?: string } | null;
    }>;
    signUp(input: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    }): Promise<{
      data: { user: AuthUser | null; session: { user: AuthUser } | null };
      error: { message: string; code?: string } | null;
    }>;
    signOut(): Promise<{ error: null }>;
    admin: ReturnType<typeof createAuthAdminApi>;
  };
}

export async function createServerDataClient(): Promise<ServerDataClient> {
  const cookieStore = await cookies();
  const data = createMysqlDataClient();

  return {
    from: (table: string) => data.from(table),
    auth: {
      async getUser() {
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        const user = await getAuthUserFromToken(token);
        return { data: { user }, error: user ? null : { message: "Auth session missing!" } };
      },

      async getSession() {
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        const user = await getAuthUserFromToken(token);
        return { data: { session: user ? { user } : null }, error: null };
      },

      async signInWithPassword(credentials) {
        const result = await signInWithPasswordCore(credentials.email, credentials.password);
        if (result.error || !result.user || !result.token) {
          return { data: { user: null, session: null }, error: result.error ?? { message: "Sign in failed" } };
        }
        try {
          cookieStore.set(SESSION_COOKIE, result.token, sessionCookieOptions());
        } catch {
          // Server Components cannot set cookies; route handlers and actions can.
        }
        return { data: { user: result.user, session: { user: result.user } }, error: null };
      },

      async signUp(input) {
        const meta = input.options?.data ?? {};
        const result = await signUpCore({
          email: input.email,
          password: input.password,
          fullName: typeof meta.full_name === "string" ? meta.full_name : undefined,
          phone: typeof meta.phone === "string" ? meta.phone : undefined,
          role: meta.role === "employer" ? "employer" : "candidate",
        });
        if (result.error || !result.user || !result.token) {
          return { data: { user: null, session: null }, error: result.error ?? { message: "Sign up failed" } };
        }
        try {
          cookieStore.set(SESSION_COOKIE, result.token, sessionCookieOptions());
        } catch {
          // ignore in Server Components
        }
        return { data: { user: result.user, session: { user: result.user } }, error: null };
      },

      async signOut() {
        try {
          cookieStore.delete(SESSION_COOKIE);
        } catch {
          // ignore in Server Components
        }
        return { error: null };
      },

      admin: createAuthAdminApi(),
    },
  };
}
