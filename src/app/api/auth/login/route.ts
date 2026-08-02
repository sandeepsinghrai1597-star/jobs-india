import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, sessionCookieOptions, signInWithPasswordCore } from "@/lib/db/auth";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, { key: "auth:login", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Enter a valid email and password." } }, { status: 400 });
  }

  const { user, token, error } = await signInWithPasswordCore(parsed.data.email, parsed.data.password);

  if (error || !user || !token) {
    return NextResponse.json(
      { error: { message: error?.message ?? "Invalid login credentials", code: error?.code } },
      { status: error?.status ?? 401 },
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
