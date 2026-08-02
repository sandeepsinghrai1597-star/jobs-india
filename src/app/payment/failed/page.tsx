import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = buildMetadata({
  title: "Payment Failed",
  description: "Your JobPulse India payment was not completed.",
  path: "/payment/failed",
});

interface PaymentFailedPageProps {
  searchParams: Promise<{
    order_id?: string;
    reason?: string;
  }>;
}

export default async function PaymentFailedPage({ searchParams }: PaymentFailedPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full rounded-[2rem] border-rose-200 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.18),_white_58%)] shadow-[0_24px_80px_-40px_rgba(190,24,93,0.35)]">
        <CardContent className="space-y-6 p-8 sm:p-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">Payment failed</p>
            <h1 className="font-heading text-3xl font-semibold text-slate-950">The payment was not completed.</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              No paid plan has been activated for this attempt. You can review the details below and retry when you’re ready.
            </p>
          </div>

          <div className="space-y-3 rounded-3xl border border-rose-100 bg-white p-5 text-sm text-slate-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order ID</p>
              <p className="mt-2 break-all font-medium text-slate-900">{params.order_id ?? "--"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reason</p>
              <p className="mt-2 text-slate-900">{params.reason ?? "The transaction was cancelled or could not be processed."}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full px-6">
              <Link href="/pricing">Try again</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
