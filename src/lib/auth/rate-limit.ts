import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/ai/rate-limit";

/**
 * In-memory IP rate limiter for auth endpoints, to blunt credential
 * stuffing and signup spam. Resets on cold starts — move to Redis if the
 * app ever runs across multiple long-lived instances.
 */

type Entry = { count: number; windowStart: number };
const store = new Map<string, Entry>();

export function enforceAuthRateLimit(
  request: Request,
  options: { key: string; limit: number; windowMs: number },
): NextResponse | null {
  const identifier = `${options.key}:${getClientIp(request)}`;
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > options.windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return null;
  }

  if (entry.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((options.windowMs - (now - entry.windowStart)) / 1000);
    return NextResponse.json(
      { error: { message: "Too many attempts. Please wait a moment and try again." } },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  entry.count += 1;
  return null;
}
