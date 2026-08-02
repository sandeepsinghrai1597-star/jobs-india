import type { UserRole } from "@/types";

export type AuthErrorState = {
  title: string;
  message: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

function isNetworkError(error: unknown, message: string) {
  return (
    error instanceof TypeError ||
    /failed to fetch|fetch failed|network|load failed/i.test(message)
  );
}

export function logAuthError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error(`[auth] ${context}`, error);
}

export function mapAuthError(error: unknown): AuthErrorState {
  const message = getErrorMessage(error).trim();

  if (isNetworkError(error, message)) {
    return {
      title: "Network problem",
      message: "We couldn't reach the sign-in service. Check your internet connection and try again.",
    };
  }

  if (/email not confirmed|email confirmation/i.test(message)) {
    return {
      title: "Email confirmation required",
      message: "Confirm your email address before signing in. Check your inbox for the Supabase confirmation link.",
    };
  }

  if (/invalid login credentials|invalid email or password/i.test(message)) {
    return {
      title: "Invalid email or password",
      message: "Double-check your email and password, then try again.",
    };
  }

  if (/user already registered|already been registered/i.test(message)) {
    return {
      title: "Account already exists",
      message: "An account with this email already exists. Try signing in instead.",
    };
  }

  if (
    /missing supabase environment variables|supabase auth is not configured|supabase|auth service|connection|timed out|unavailable/i.test(
      message,
    )
  ) {
    return {
      title: "Supabase connection issue",
      message: "We couldn't connect to Supabase right now. Please try again in a moment.",
    };
  }

  return {
    title: "Authentication failed",
    message: message || "Something went wrong while contacting the authentication service. Please try again.",
  };
}

export function getRoleHome(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "employer") return "/employer";
  return "/dashboard";
}

function isUserRole(value: unknown): value is UserRole {
  return value === "candidate" || value === "employer" || value === "admin";
}

export function getRoleFromAuthMetadata(appMetadataRole: unknown, userMetadataRole: unknown): UserRole {
  if (isUserRole(appMetadataRole)) {
    return appMetadataRole;
  }

  if (isUserRole(userMetadataRole)) {
    return userMetadataRole;
  }

  return "candidate";
}
