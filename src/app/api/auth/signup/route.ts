import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, sessionCookieOptions, signUpCore } from "@/lib/db/auth";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  role: z.enum(["candidate", "employer"]).optional(),
});

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, { key: "auth:signup", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: parsed.error.issues[0]?.message ?? "Check the details you entered." } },
      { status: 400 },
    );
  }

  const { user, token, error } = await signUpCore(parsed.data);

  if (error || !user || !token) {
    return NextResponse.json(
      { error: { message: error?.message ?? "Sign up failed", code: error?.code } },
      { status: error?.status ?? 400 },
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
