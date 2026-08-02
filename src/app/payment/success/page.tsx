import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = buildMetadata({
  title: "Payment Success",
  description: "Your JobPulse India payment was verified successfully.",
  path: "/payment/success",
});

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    order_id?: string;
    payment_id?: string;
    plan?: string;
  }>;
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full rounded-[2rem] border-emerald-200 bg-[radial-gradient(circle_at_top,_rgba(110,231,183,0.28),_white_58%)] shadow-[0_24px_80px_-40px_rgba(5,150,105,0.45)]">
        <CardContent className="space-y-6 p-8 sm:p-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Payment successful</p>
            <h1 className="font-heading text-3xl font-semibold text-slate-950">Your subscription is now active.</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              We verified the Razorpay payment and updated your JobPulse subscription. You can continue from your dashboard immediately.
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-emerald-100 bg-white p-5 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plan</p>
              <p className="mt-2 font-medium text-slate-900">{params.plan ?? "Paid plan"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order ID</p>
              <p className="mt-2 break-all font-medium text-slate-900">{params.order_id ?? "--"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payment ID</p>
              <p className="mt-2 break-all font-medium text-slate-900">{params.payment_id ?? "--"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full px-6">
              <Link href="/dashboard">Go to candidate dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link href="/employer">Go to employer workspace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
