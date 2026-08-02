/**
 * Browser auth client. The database now lives on Hostinger MySQL, which a
 * browser cannot reach directly, so these methods post to /api/auth/* route
 * handlers instead. The method names and result shapes match what the auth
 * forms already expect, so their call sites are unchanged.
 */

type AuthResult<T> = { data: T; error: { message: string; code?: string } | null };

type AuthUserPayload = {
  id: string;
  email: string;
  app_metadata: { role?: string };
  user_metadata: { role?: string; full_name?: string };
} | null;

async function postJson(path: string, body: unknown): Promise<AuthResult<Record<string, unknown>>> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const error = (payload.error as { message?: string; code?: string } | undefined) ?? {};
      return {
        data: {},
        error: { message: error.message ?? "Request failed. Please try again.", code: error.code },
      };
    }

    return { data: payload, error: null };
  } catch {
    return { data: {}, error: { message: "Network error. Check your connection and try again." } };
  }
}

export function createClient() {
  return {
    auth: {
      async signInWithPassword(credentials: { email: string; password: string }) {
        const { data, error } = await postJson("/api/auth/login", credentials);
        return {
          data: { user: (data.user as AuthUserPayload) ?? null, session: data.user ? { user: data.user } : null },
          error,
        };
      },

      async signUp(input: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
      }) {
        const { data, error } = await postJson("/api/auth/signup", {
          email: input.email,
          password: input.password,
          fullName: input.options?.data?.full_name,
          phone: input.options?.data?.phone,
          role: input.options?.data?.role,
        });
        return {
          data: { user: (data.user as AuthUserPayload) ?? null, session: data.user ? { user: data.user } : null },
          error,
        };
      },

      // Accounts are active immediately (there is no email-confirmation
      // step), so there is nothing to resend. The parameter is kept because
      // the signup form still calls this, and success keeps its flow intact.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async resend(input: { type: string; email: string; options?: { emailRedirectTo?: string } }) {
        return { data: {}, error: null };
      },

      // `redirectTo` is ignored: the reset link is built server-side from
      // NEXT_PUBLIC_SITE_URL so a caller cannot point it at another origin.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
        const { error } = await postJson("/api/auth/forgot-password", { email });
        return { data: {}, error };
      },

      async signOut() {
        await postJson("/api/auth/logout", {});
        return { error: null };
      },
    },
  };
}
