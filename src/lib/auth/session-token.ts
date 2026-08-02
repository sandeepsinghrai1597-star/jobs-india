import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session token helpers.
 *
 * Deliberately free of `server-only`, `mysql2`, and `bcryptjs` imports so the
 * middleware (Edge runtime) can verify sessions. Node-only auth work lives in
 * @/lib/db/auth.
 */

export const SESSION_COOKIE = "jp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthRole = "candidate" | "employer" | "admin";

export interface SessionPayload {
  id: string;
  email: string;
  role: AuthRole;
}

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionToken(user: SessionPayload) {
  const secret = getJwtSecret();
  if (!secret) throw new Error("AUTH_JWT_SECRET is not configured.");

  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: (payload.email as string) ?? "",
      role: ((payload.role as string) ?? "candidate") as AuthRole,
    };
  } catch {
    return null;
  }
}
