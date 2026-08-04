import fs from "node:fs";
import path from "node:path";
import { expect, type Browser, type Locator, type Page } from "@playwright/test";

type UserFixture = {
  id: string;
  email: string;
  password: string;
  role: "candidate" | "employer" | "admin";
  name: string;
};

type Fixtures = {
  baseUrl: string;
  database?: string;
  users: Record<string, UserFixture>;
};

let fixturesCache: Fixtures | null = null;

export function getFixtures(): Fixtures {
  if (fixturesCache) {
    return fixturesCache;
  }

  const fixturePath = path.join(process.cwd(), "e2e", ".generated", "fixtures.json");
  fixturesCache = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Fixtures;
  return fixturesCache;
}

export async function login(page: Page, email: string, password: string) {
  // Drop any existing session first. /login redirects authenticated users to
  // their role home, so signing in as a second user mid-spec (e.g. right after
  // a signup) would never reach the form.
  await page.context().clearCookies();

  // /api/auth/login rate-limits to 10 attempts per minute per IP. The suite
  // signs in far more often than that, so a full run used to fail on whichever
  // spec crossed the threshold. playwright.config.ts disables the limiter for
  // servers it starts; this retry covers `reuseExistingServer` attaching to a
  // dev server that was started without the flag.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /login to jobpulse india/i })).toBeVisible();
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);

    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/auth/login") && candidate.request().method() === "POST",
      ),
      page.getByRole("button", { name: /sign in/i }).click(),
    ]);

    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] ?? "10");
      await page.waitForTimeout(Math.min(Number.isFinite(retryAfter) ? retryAfter : 10, 65) * 1000 + 500);
      continue;
    }

    if (!response.ok()) {
      throw new Error(`Login failed for ${email}: HTTP ${response.status()} ${await response.text()}`);
    }

    // Wait for the post-login redirect to land. Without this, a caller that
    // immediately navigates can race the sign-in and get bounced back to /login.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
    return;
  }

  throw new Error(`Login for ${email} kept hitting the auth rate limiter after 3 attempts.`);
}

/**
 * Playwright records every response body a traced context sees as a trace
 * resource. Closing a secondary context can race that write and reject with
 * "file data stream has unexpected number of bytes", which then leaves a
 * truncated archive ("End of central directory record signature not found").
 *
 * Both are artifact-machinery failures raised during teardown, after the test's
 * assertions have already run, and they were masking the real results — with
 * `--trace=off` the same specs fail (or pass) on their actual assertions. Only
 * these two signatures are swallowed; anything else from close() still throws.
 *
 * The trigger scales with response size, so it shows up on the specs that fetch
 * an employer's whole job list and gets likelier as that table grows across
 * runs. Purging stale QA jobs in setup:e2e would remove the pressure.
 */
const TRACE_ARTIFACT_TEARDOWN_ERRORS = [
  "file data stream has unexpected number of bytes",
  "End of central directory record signature not found",
];

/**
 * A second signed-in session in its own browser context.
 *
 * Specs previously used `browser.newPage()` and closed only the page, leaking
 * the context. Always close via the returned handle.
 */
export async function createSignedInSession(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password);

  return {
    page,
    close: async () => {
      try {
        await context.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!TRACE_ARTIFACT_TEARDOWN_ERRORS.some((known) => message.includes(known))) {
          throw error;
        }
        console.warn(`Ignoring Playwright trace teardown error for ${email}: ${message}`);
      }
    },
  };
}

export async function logout(page: Page) {
  await page.getByRole("link", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login|\/$/);
}

export async function fillCandidateOnboarding(page: Page) {
  await page.goto("/dashboard/profile");
  await page.getByPlaceholder("Full name").fill("Demo Candidate");
  await page.getByPlaceholder("Phone number").fill("+91 9876543210");
  await page.getByPlaceholder("Current city").fill("Bengaluru");
  await page.getByPlaceholder("State").fill("Karnataka");
  await page.getByPlaceholder("Education").fill("BTech");
  await page.getByPlaceholder("Experience").fill("2 years");
  await page.getByPlaceholder("Headline").fill("QA Automation Engineer");
  await page.getByPlaceholder("Resume URL").fill("https://example.com/demo-candidate-resume");
  await page.getByPlaceholder("Skills, comma separated").fill("Playwright, QA, API Testing");
  await page.getByPlaceholder("Preferred roles, comma separated").fill("QA Engineer, SDET");
  await page.getByPlaceholder("Preferred job types, comma separated").fill("full-time, remote");
  await page.getByPlaceholder("Expected salary in INR").fill("900000");
  await page.getByPlaceholder("Short professional summary").fill(
    "Experienced in end-to-end web testing and regression coverage.",
  );
  await page.getByRole("button", { name: /save profile/i }).click();
  // The success alert renders a title and a description that both match, so
  // scope to the first hit rather than tripping strict mode.
  await expect(
    page.getByText(/profile updated|candidate profile saved successfully/i).first(),
  ).toBeVisible();
}

export async function fillEmployerOnboarding(page: Page) {
  await page.goto("/employer/profile");
  await page.getByPlaceholder("Company name").fill("JobPulse QA Employer Co");
  await page.getByPlaceholder("Company website").fill("https://employer-qa.example.com");
  await page.getByPlaceholder("Company email").fill("hr@employer-qa.example.com");
  await page.getByPlaceholder("Industry").fill("Software");
  await page.getByPlaceholder("City").fill("Pune");
  await page.getByPlaceholder("State").fill("Maharashtra");
  await page.getByPlaceholder("Recruiter name").fill("Employer Recruiter");
  await page.getByPlaceholder("Recruiter phone").fill("+91 9988776655");
  await page.getByRole("button", { name: /save employer profile/i }).click();
  await expect(page.getByText(/employer profile saved successfully/i)).toBeVisible();
}

export async function createEmployerJob(page: Page, title: string) {
  await page.goto("/employer/jobs/new");
  await page.getByLabel("Job title").fill(title);
  await page.getByLabel("Company name").fill("JobPulse QA Employer Co");
  await page.getByLabel("City").fill("Pune");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("Education required").fill("Graduate");
  await page.getByLabel("Experience required").fill("2 years");
  await page.getByLabel("Industry").fill("Software");
  await page.getByLabel("Skills").fill("QA\nPlaywright\nRegression");
  // Must clear the 50-character minimum the job form enforces.
  await page
    .getByLabel("Description")
    .fill("QA role created from Playwright automation to exercise the employer posting flow end to end.");
  await page.getByLabel("Responsibilities").fill("Write tests\nReview regressions");
  await page.getByLabel("Requirements").fill("Automation experience\nCommunication");
  await page.getByLabel("Openings").fill("2");
  await page.getByLabel("Deadline").fill("2026-12-31");
  await page.getByLabel("Salary min").fill("600000");
  await page.getByLabel("Salary max").fill("850000");
  await page.getByLabel("Application URL optional").fill("https://example.com/employer-apply");
  // Wait for the create call itself. The old assertion was toHaveURL(
  // /\/employer\/jobs/), which the form's own page (/employer/jobs/new) already
  // satisfies — so it resolved instantly and callers raced ahead of the POST,
  // then failed to find the "newly created" job in the list.
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url().includes("/api/employer/jobs") &&
        candidate.request().method() === "POST",
    ),
    page.getByRole("button", { name: /create job post/i }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/employer\/jobs(?!\/new)/);
}

export async function createAdminJob(page: Page, title: string, companyName: string) {
  await page.goto("/admin/jobs/new");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Job title").fill(title);
  // exact: the admin form also has a "Company description" field, so a loose
  // label match resolves to two textareas and trips strict mode.
  await page
    .getByLabel("Description", { exact: true })
    .fill("Admin-created QA listing for automated moderation testing.");
  await page.getByLabel("Responsibilities").fill("Moderate jobs\nReview listings");
  await page.getByLabel("Requirements").fill("Admin permissions\nAttention to detail");
  await page.getByLabel("Skills").fill("Admin\nQA\nModeration");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("Industry").fill("Operations");
  await page.getByLabel("Salary min").fill("450000");
  await page.getByLabel("Salary max").fill("650000");
  await page.getByLabel("Openings").fill("1");
  await page.getByLabel("Deadline").fill("2026-12-31");
  await page.getByLabel("Apply URL").fill("https://example.com/admin-created-job");
  await page.getByRole("button", { name: /create pending job/i }).click();
  // createJobAction redirects to the pending queue on the admin dashboard
  // (actions.ts), not to /admin/jobs/review as this previously expected.
  await expect(page).toHaveURL(/\/admin\?section=jobs&status=pending/);
}

export async function searchJob(page: Page, keyword: string) {
  await page.goto("/jobs");
  await page.getByPlaceholder("Job title, company, skill").fill(keyword);
  await page.getByRole("button", { name: /search jobs/i }).click();
}

export async function firstPublicJob(page: Page) {
  await page.goto("/jobs");
  const firstTitleLink = page.locator('a[href^="/jobs/"]').filter({ hasText: /.+/ }).first();
  await expect(firstTitleLink).toBeVisible();
  const href = await firstTitleLink.getAttribute("href");
  const title = (await firstTitleLink.textContent())?.trim() ?? "";

  if (!href || !title) {
    throw new Error("Could not determine the first public job from /jobs.");
  }

  return {
    href,
    title,
    slug: href.replace(/^\/jobs\//, ""),
  };
}

export async function createJobAndGetId(page: Page, title: string) {
  await createEmployerJob(page, title);
  const response = await page.request.get("/api/employer/jobs");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    jobs: Array<{ id: string; title: string }>;
  };
  const job = body.jobs.find((item) => item.title === title);
  if (!job) {
    throw new Error(`Could not locate newly created employer job: ${title}`);
  }
  return job.id;
}

export async function expectRedirectAwayFrom(page: Page, startPath: string, disallowedPattern: RegExp) {
  await page.goto(startPath);
  await expect(page).not.toHaveURL(disallowedPattern);
}

export async function clickCardLinkByTitle(page: Page, title: string) {
  await page.getByRole("link", { name: title }).first().click();
}

export async function saveDebugScreenshot(page: Page, name: string) {
  const targetDir = path.join(process.cwd(), "test-results", "manual-screenshots");
  fs.mkdirSync(targetDir, { recursive: true });
  await page.screenshot({
    path: path.join(targetDir, `${name}.png`),
    fullPage: true,
  });
}

export async function firstButton(locator: Locator, buttonName: RegExp | string) {
  const button = locator.getByRole("button", { name: buttonName }).first();
  await expect(button).toBeVisible();
  return button;
}
