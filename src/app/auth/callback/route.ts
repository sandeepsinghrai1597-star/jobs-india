import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy auth callback. Under the previous provider this exchanged an email
 * confirmation code for a session. Accounts are now active immediately at
 * signup, so there is nothing to exchange — this route only keeps older
 * emailed links working by forwarding them to a safe destination.
 */

function getSafeRedirectPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirectTo = getSafeRedirectPath(url.searchParams.get("next"));
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (authError) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", redirectTo);
    loginUrl.searchParams.set("authError", authError);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
