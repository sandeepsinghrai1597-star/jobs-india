"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Mail, Lock, Phone, User } from "lucide-react";
import { signupSchema } from "@/lib/validation/schemas";
import { type AuthErrorState, logAuthError, mapAuthError } from "@/lib/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RoleSelector } from "@/components/auth/role-selector";

export function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthErrorState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = signupSchema.safeParse({
      fullName,
      email,
      phone,
      role,
      password,
    });

    if (!parsed.success) {
      setError({
        title: "Signup details incomplete",
        message: parsed.error.issues[0]?.message ?? "Please complete the signup form.",
      });
      return;
    }

    setIsSubmitting(true);

    let supabase;
    try {
      supabase = createClient();
    } catch (createClientError) {
      logAuthError("signup:create-client", createClientError);
      setError(mapAuthError(createClientError));
      setIsSubmitting(false);
      return;
    }

    const redirectPath = parsed.data.role === "employer" ? "/employer" : "/dashboard";

    try {
      const callbackOrigin =
        siteUrl && /^https?:\/\//i.test(siteUrl) ? siteUrl.replace(/\/$/, "") : window.location.origin;
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${callbackOrigin}/auth/callback?next=${redirectPath}`,
          data: {
            full_name: parsed.data.fullName,
            phone: parsed.data.phone,
            role: parsed.data.role,
          },
        },
      });

      if (signUpError) {
        logAuthError("signup:sign-up", signUpError);
        setError(mapAuthError(signUpError));
        setIsSubmitting(false);
        return;
      }

      setSignupSuccess(true);
      setMessage(
        data.session
          ? "Your account was created. Please confirm your email before continuing so your login works reliably."
          : "We sent a confirmation link to your email. Click it to activate your account.",
      );
      setIsSubmitting(false);
    } catch (signUpError) {
      logAuthError("signup:unexpected", signUpError);
      setError(mapAuthError(signUpError));
      setIsSubmitting(false);
    }
  }

  async function handleResendEmail() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    let supabase;
    try {
      supabase = createClient();
    } catch (createClientError) {
      logAuthError("signup-resend:create-client", createClientError);
      setError(mapAuthError(createClientError));
      setIsSubmitting(false);
      return;
    }

    const callbackOrigin =
      siteUrl && /^https?:\/\//i.test(siteUrl) ? siteUrl.replace(/\/$/, "") : window.location.origin;
    const redirectPath = role === "employer" ? "/employer" : "/dashboard";
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${callbackOrigin}/auth/callback?next=${redirectPath}`,
      },
    });

    if (resendError) {
      logAuthError("signup-resend:resend", resendError);
      setError(mapAuthError(resendError));
    } else {
      setMessage("Confirmation email resent. Check your inbox and spam folder.");
    }

    setIsSubmitting(false);
  }

  if (signupSuccess) {
    return (
      <div className="space-y-5 py-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Mail className="size-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left">
            <p className="font-semibold text-red-900">{error.title}</p>
            <p className="mt-1 text-sm text-red-800">{error.message}</p>
          </div>
        ) : null}
        <p className="text-xs text-slate-500">
          Did not receive it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isSubmitting}
            className="font-semibold text-blue-600 underline underline-offset-2 disabled:opacity-70"
          >
            resend the email
          </button>
          .
        </p>
        <Button asChild variant="outline" className="w-full rounded-lg">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
      {/* Full Name Input */}
      <div className="space-y-2">
        <label htmlFor="fullname" className="text-sm font-semibold text-slate-900">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="fullname"
            type="text"
            placeholder="John Doe"
            disabled={isSubmitting}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400"
          />
        </div>
      </div>

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

      {/* Phone Input */}
      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-semibold text-slate-900">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            disabled={isSubmitting}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400"
          />
        </div>
      </div>

      {/* Role Selector */}
      <RoleSelector value={role} onChange={setRole} />

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
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
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

      {/* Success Message */}
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Check your email</p>
          <p className="mt-1 text-sm text-amber-800">{message}</p>
        </div>
      ) : null}

      {/* Submit Button */}
      <Button
        disabled={isSubmitting}
        type="submit"
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" />
            Creating account...
          </span>
        ) : (
          "Create Account"
        )}
      </Button>

      {/* Sign In Link */}
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:underline decoration-2 underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
