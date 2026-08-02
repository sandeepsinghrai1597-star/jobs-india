"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      setError(resetError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(
      "If an account exists for this email, a password reset link has been sent. Check your inbox.",
    );
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-900">Request failed</p>
          <p className="mt-1 text-sm text-red-800">{error}</p>
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
            Sending reset link...
          </span>
        ) : (
          "Send Reset Link"
        )}
      </Button>

      {/* Back to Login */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:text-slate-900 hover:gap-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
    </form>
  );
}
