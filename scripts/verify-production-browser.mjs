import { chromium } from "playwright";

const [
  ,
  ,
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL ??
    "https://lightgrey-goldfinch-471212.hostingersite.com",
  adminEmail,
  adminPassword,
  candidateEmail,
  candidatePassword,
] = process.argv;

if (!adminEmail || !adminPassword) {
  console.error(
    "Usage: node scripts/verify-production-browser.mjs <baseUrl> <adminEmail> <adminPassword> [candidateEmail] [candidatePassword]",
  );
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = {
  baseUrl,
  homepageLoaded: false,
  publicJobsVisible: false,
  guestApplyRedirectsToLogin: false,
  adminLoginReachedDashboard: false,
  adminPagesChecked: {},
  candidateApplyRedirectedToOfficialSite: false,
  candidateApplyTarget: null,
  firstJobTitle: null,
  firstJobUrl: null,
};

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  results.homepageLoaded = await page.getByText(/jobs/i).first().isVisible().catch(() => false);

  await page.goto(`${baseUrl}/jobs`, { waitUntil: "networkidle" });
  const firstLink = page.locator('a[href*="/jobs/"]').first();
  const linkVisible = await firstLink.isVisible().catch(() => false);
  if (linkVisible) {
    const firstHref = await firstLink.getAttribute("href");
    const firstTitle = ((await firstLink.textContent()) ?? "").trim();

    results.publicJobsVisible = Boolean(firstHref && firstTitle);
    results.firstJobTitle = firstTitle;
    results.firstJobUrl = firstHref ? new URL(firstHref, baseUrl).toString() : null;

    if (results.firstJobUrl) {
      await page.goto(results.firstJobUrl, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /apply now/i }).click();
      await page.waitForURL(/\/login\?next=/, { timeout: 30000 });
      results.guestApplyRedirectsToLogin = /\/login\?next=/.test(page.url());
    }
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/email address/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 30000 });
  results.adminLoginReachedDashboard = /\/admin/.test(page.url());

  const adminChecks = [
    ["/admin", /admin/i],
    ["/admin?section=users", /users|role/i],
    ["/admin/jobs/review", /review|jobs/i],
    ["/admin/jobs/fetched", /fetched|jobs/i],
    ["/admin/job-sources", /source|jobs/i],
  ];

  for (const [path, textPattern] of adminChecks) {
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    const reachedAdmin = !new URL(page.url()).pathname.startsWith("/login");
    const pageResponded = response ? response.status() < 400 : true;
    const hasExpectedText = await page.getByText(textPattern).first().isVisible().catch(() => false);
    results.adminPagesChecked[path] = pageResponded && reachedAdmin && hasExpectedText;
  }

  if (candidateEmail && candidatePassword && results.firstJobUrl) {
    const candidatePage = await browser.newPage();
    try {
      await candidatePage.goto(`${baseUrl}/login?next=${encodeURIComponent(new URL(results.firstJobUrl).pathname + "?apply=1")}`, {
        waitUntil: "networkidle",
      });
      await candidatePage.getByLabel(/email address/i).fill(candidateEmail);
      await candidatePage.getByLabel(/password/i).fill(candidatePassword);
      await candidatePage.getByLabel(/password/i).fill(candidatePassword);
      await candidatePage.getByRole("button", { name: /sign in/i }).click();
      await candidatePage.waitForURL(/\/jobs\/.+\?apply=1/, { timeout: 30000 });
      await candidatePage.getByRole("button", { name: /submit application/i }).click();
      await candidatePage.waitForURL((url) => !url.toString().startsWith(baseUrl), {
        timeout: 30000,
      });
      results.candidateApplyRedirectedToOfficialSite = true;
      results.candidateApplyTarget = candidatePage.url();
    } finally {
      await candidatePage.close();
    }
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await page.close();
  await browser.close();
}
