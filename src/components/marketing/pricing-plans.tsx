"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { PlanId, PricingPlanDefinition } from "@/lib/payments/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
    };
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string | null;
  };
  theme?: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
}

async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PricingPlansProps {
  candidatePlans: PricingPlanDefinition[];
  employerPlans: PricingPlanDefinition[];
  currentRole: "candidate" | "employer" | "admin" | null;
  currentPlan: string | null;
  paymentsEnabled: boolean;
}

export function PricingPlans({
  candidatePlans,
  employerPlans,
  currentRole,
  currentPlan,
  paymentsEnabled,
}: PricingPlansProps) {
  const router = useRouter();
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyFailedPayment(orderId: string, errorPayload?: RazorpayFailureResponse["error"]) {
    await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "failed",
        orderId,
        errorCode: errorPayload?.code,
        errorDescription: errorPayload?.description,
        errorReason: errorPayload?.reason,
      }),
    });
  }

  async function startCheckout(planId: PlanId) {
    if (planId === "candidate-free" || planId === "employer-free") {
      router.push("/signup");
      return;
    }

    if (!paymentsEnabled) {
      setError("Paid checkout is not live in this environment yet. Keep free plans visible, but do not launch paid CTAs until Razorpay is configured.");
      return;
    }

    setError(null);
    setLoadingPlanId(planId);

    try {
      const hasScript = await loadRazorpayScript();

      if (!hasScript || !window.Razorpay) {
        setError("Razorpay checkout failed to load. Please refresh and try again.");
        return;
      }

      const orderResponse = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const orderJson = (await orderResponse.json()) as
        | {
            message?: string;
            keyId: string;
            order: { id: string; amount: number; currency: string };
            plan: { id: string; name: string };
            user: { name?: string; email?: string; phone?: string | null };
          }
        | { message: string };

      if (!orderResponse.ok || !("order" in orderJson)) {
        if (orderResponse.status === 401) {
          router.push("/login");
          return;
        }

        setError(orderJson.message ?? "Unable to start payment right now.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderJson.keyId,
        amount: orderJson.order.amount,
        currency: orderJson.order.currency,
        name: "JobPulse India",
        description: `${orderJson.plan.name} plan`,
        order_id: orderJson.order.id,
        prefill: {
          name: orderJson.user.name,
          email: orderJson.user.email,
          contact: orderJson.user.phone,
        },
        theme: {
          color: "#0f766e",
        },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "success",
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });

          const verifyJson = (await verifyResponse.json()) as { message?: string; plan?: string };

          if (!verifyResponse.ok) {
            setError(verifyJson.message ?? "Payment succeeded but verification failed.");
            router.push(`/payment/failed?order_id=${encodeURIComponent(response.razorpay_order_id)}`);
            return;
          }

          router.push(
            `/payment/success?order_id=${encodeURIComponent(response.razorpay_order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}&plan=${encodeURIComponent(verifyJson.plan ?? planId)}`,
          );
        },
      });

      razorpay.on("payment.failed", async (response) => {
        const orderId = response.error?.metadata?.order_id ?? orderJson.order.id;
        await verifyFailedPayment(orderId, response.error);
        router.push(
          `/payment/failed?order_id=${encodeURIComponent(orderId)}&reason=${encodeURIComponent(response.error?.description ?? "Payment was not completed.")}`,
        );
      });

      razorpay.open();
    } catch {
      setError("Something went wrong while opening checkout. Please try again.");
    } finally {
      setLoadingPlanId(null);
    }
  }

  function renderPlanCard(plan: PricingPlanDefinition, tone: "candidate" | "employer") {
    const isCurrentPlan = currentPlan === plan.id || (currentPlan === "free" && plan.id.endsWith("free"));
    const palette =
      tone === "candidate"
        ? "border-teal-200/70 bg-linear-to-br from-white via-teal-50 to-cyan-100 text-slate-900"
        : "border-amber-200/70 bg-linear-to-br from-white via-orange-50 to-amber-100 text-slate-900";

    const highlightedPalette =
      tone === "candidate"
        ? "border-teal-900/10 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.28),_rgba(15,23,42,0.96)_52%)] text-slate-950"
        : "border-orange-900/10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_rgba(120,53,15,0.96)_55%)] text-slate-950";

    return (
      <Card
        key={plan.id}
        className={`rounded-[2rem] border shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] ${
          plan.highlighted ? highlightedPalette : palette
        }`}
      >
        <CardContent className="flex h-full flex-col gap-6 p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${plan.highlighted ? "text-slate-950/70" : "text-slate-500"}`}>
                {tone}
              </p>
              <h3 className="mt-3 font-heading text-3xl font-semibold">{plan.name}</h3>
            </div>
            {plan.highlighted ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
                <Sparkles className="h-3.5 w-3.5" />
                Most popular
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-4xl font-semibold tracking-tight">{plan.priceLabel}</p>
            <p className={`mt-3 max-w-sm text-sm leading-6 ${plan.highlighted ? "text-slate-950/76" : "text-slate-600"}`}>
              {plan.description}
            </p>
          </div>

          <ul className={`space-y-3 text-sm ${plan.highlighted ? "text-slate-950/88" : "text-slate-700"}`}>
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${plan.highlighted ? "bg-white" : "bg-slate-100"}`}>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-3">
            <Button
              className="h-11 w-full rounded-full px-5 text-sm font-semibold"
              variant={plan.highlighted ? "secondary" : "default"}
              disabled={loadingPlanId === plan.id || (!paymentsEnabled && !plan.id.endsWith("free"))}
              onClick={() => startCheckout(plan.id)}
            >
              {loadingPlanId === plan.id ? "Opening checkout..." : plan.cta}
              {loadingPlanId === plan.id ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
            {isCurrentPlan ? (
              <p className={`text-center text-xs font-medium ${plan.highlighted ? "text-slate-950/76" : "text-slate-600"}`}>
                Current plan on this account
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(240,253,250,0.95),rgba(255,247,237,0.95))] p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.25)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Transparent billing</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-900">Pay only when you need deeper hiring or career tools</h2>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-white px-3 py-1">INR billing</span>
            <span className="rounded-full bg-white px-3 py-1">Monthly plans</span>
            <span className="rounded-full bg-white px-3 py-1">
              {currentRole ? `Signed in as ${currentRole}` : "Sign in required for paid checkout"}
            </span>
          </div>
        </div>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {!paymentsEnabled ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">Paid plans launching soon.</span>{" "}
            Free plans are fully active. To get notified when Pro upgrades go live, email us at{" "}
            <a href="mailto:hello@jobpulseindia.com" className="font-semibold text-primary hover:underline">
              hello@jobpulseindia.com
            </a>.
          </div>
        ) : null}
      </div>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">For candidates</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-slate-900">From discovery to interview confidence</h3>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Candidate dashboard
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {candidatePlans.map((plan) => renderPlanCard(plan, "candidate"))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">For employers</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-slate-900">Post faster, manage applicants, and scale hiring signals</h3>
          </div>
          <Link href="/employer" className="text-sm font-medium text-amber-700 hover:text-amber-800">
            Employer workspace
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {employerPlans.map((plan) => renderPlanCard(plan, "employer"))}
        </div>
      </section>
    </div>
  );
}
