import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";
import { getRoleHome } from "@/lib/auth/auth-errors";

/**
 * Route protection for the middleware. The session JWT carries the user's
 * role, so authorization needs no database round-trip — which matters
 * because middleware runs on the Edge runtime and cannot open a MySQL
 * connection. Role changes take effect on the user's next sign-in.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isCandidateRoute = pathname.startsWith("/dashboard");
  const isEmployerRoute = pathname.startsWith("/employer");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isCandidateRoute && !isEmployerRoute && !isAdminRoute) {
    return response;
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role;

  if (
    (isCandidateRoute && role !== "candidate") ||
    (isEmployerRoute && role !== "employer" && role !== "admin") ||
    (isAdminRoute && role !== "admin")
  ) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  return response;
}
