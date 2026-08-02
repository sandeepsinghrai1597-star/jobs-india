import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
