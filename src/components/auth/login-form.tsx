"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { loginSchema } from "@/lib/validation/schemas";
import {
  type AuthErrorState,
  getRoleFromAuthMetadata,
  getRoleHome,
  logAuthError,
  mapAuthError,
} from "@/lib/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm({
  redirectTo = "/dashboard",
  initialError = null,
}: {
  redirectTo?: string;
  initialError?: AuthErrorState | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthErrorState | null>(initialError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError({
        title: "Invalid email or password",
        message: parsed.error.issues[0]?.message ?? "Please enter valid credentials.",
      });
      return;
    }

    setIsSubmitting(true);

    let supabase;
    try {
      supabase = createClient();
    } catch (createClientError) {
      logAuthError("login:create-client", createClientError);
      setError(mapAuthError(createClientError));
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signInError, data } = await supabase.auth.signInWithPassword(parsed.data);

      if (signInError) {
        logAuthError("login:sign-in", signInError);
        setError(mapAuthError(signInError));
        setIsSubmitting(false);
        return;
      }

      const nextPath =
        redirectTo !== "/dashboard"
          ? redirectTo
          : getRoleHome(
              getRoleFromAuthMetadata(
                data.user?.app_metadata?.role,
                data.user?.user_metadata?.role,
              ),
            );

      router.refresh();
      router.push(nextPath);
    } catch (signInError) {
      logAuthError("login:unexpected", signInError);
      setError(mapAuthError(signInError));
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
      {/* Email Input */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-slate-900">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-slate-900">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isSubmitting}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-900">{error.title}</p>
          <p className="mt-1 text-sm text-red-800">{error.message}</p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => formRef.current?.requestSubmit()}
            className="mt-3 text-sm font-semibold text-red-900 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Submit Button */}
      <Button
        disabled={isSubmitting}
        type="submit"
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign In
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* Footer Links */}
      <div className="space-y-3 border-t border-slate-200 pt-5">
        <Link
          href="/auth/forgot-password"
          className="flex items-center justify-center gap-1 text-sm font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:underline decoration-2 underline-offset-2"
        >
          Forgot password?
        </Link>
        <p className="text-center text-sm text-slate-600">
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:underline decoration-2 underline-offset-2"
          >
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
