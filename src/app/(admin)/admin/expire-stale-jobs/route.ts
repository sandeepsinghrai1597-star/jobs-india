import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/jobs/live";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/redirects";
import { syncExpiredJobs } from "@/server/jobs/expiration";

export async function GET(request: NextRequest) {
  await requireRole(["admin"]);

  const returnToRaw = request.nextUrl.searchParams.get("returnTo")?.trim() ?? "/admin";
  const returnTo = returnToRaw.startsWith("/admin") ? returnToRaw : "/admin";

  try {
    await syncExpiredJobs({ force: true });
  } catch (error) {
    console.error("Admin route expire-stale-jobs failed", error);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/jobs/review");
  revalidatePath("/jobs");
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, { expire: 0 });
  revalidatePath("/sitemap.xml");

  return NextResponse.redirect(new URL(returnTo, request.url));
}
