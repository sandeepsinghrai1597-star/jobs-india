import { createHash, randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createMysqlDataClient } from "@/lib/db/mysql";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { buildPasswordResetEmail, sendMail } from "@/lib/auth/mailer";
import { siteConfig } from "@/lib/data/site";

const schema = z.object({ email: z.string().email() });

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, { key: "auth:forgot", limit: 5, windowMs: 15 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Enter a valid email address." } }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = createMysqlDataClient();

  const { data: user } = await db.from("users").select("id").eq("email", email).maybeSingle();

  // Always report success so this endpoint can't be used to discover which
  // email addresses have accounts.
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db.from("auth_tokens").insert({
      id: randomUUID(),
      user_id: (user as { id: string }).id,
      token_hash: tokenHash,
      type: "reset",
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/auth/reset-password?token=${token}`;
    const message = buildPasswordResetEmail(resetUrl);
    await sendMail({ to: email, ...message });
  }

  return NextResponse.json({ ok: true });
}
