import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createMysqlDataClient } from "@/lib/db/mysql";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { updatePasswordCore } from "@/lib/db/auth";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  const limited = enforceAuthRateLimit(request, { key: "auth:reset", limit: 10, windowMs: 15 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid reset request." } },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const db = createMysqlDataClient();

  const { data: row } = await db
    .from("auth_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .eq("type", "reset")
    .maybeSingle();

  const token = row as { id: string; user_id: string; expires_at: string; used_at: string | null } | null;

  if (!token || token.used_at || new Date(token.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: { message: "This reset link is invalid or has expired. Request a new one." } },
      { status: 400 },
    );
  }

  const { error } = await updatePasswordCore(token.user_id, parsed.data.password);
  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  await db.from("auth_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);

  return NextResponse.json({ ok: true });
}
