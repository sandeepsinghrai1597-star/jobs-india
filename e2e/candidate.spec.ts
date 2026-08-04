import { expect, test, type Page } from "@playwright/test";
import {
  firstPublicJob,
  fillCandidateOnboarding,
  getFixtures,
  login,
  saveDebugScreenshot,
} from "./utils";

test.describe("Candidate flows", () => {
  test("candidate signup form works and existing candidate can complete journey", async ({ page }) => {
    const fixtures = getFixtures();

    await page.goto("/signup");
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    const candidateEmail = `candidate.signup.${Date.now()}@example.com`;
    await page.getByLabel("Full Name").fill("Signup Candidate");
    await page.getByLabel("Email Address").fill(candidateEmail);
    await page.getByLabel("Phone Number").fill("+91 9000001234");
    await page.getByLabel("Password").fill("JobPulse123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(
      page.getByText(/check your email|candidate dashboard|workspace overview/i),
    ).toBeVisible();

    await login(page, fixtures.users.candidate.email, fixtures.users.candidate.password);
    await expect(page).toHaveURL(/\/dashboard/);

    await fillCandidateOnboarding(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /candidate dashboard/i })).toBeVisible();
    await saveDebugScreenshot(page, "candidate-dashboard");

    const publicJob = await firstPublicJob(page);
    await page.goto("/jobs");
    // Read the title from the same render that we click, rather than reusing
    // publicJob: /jobs ordering shifts as other specs publish listings, so the
    // top card here is not necessarily the one firstPublicJob() saw. Both
    // locators resolve against this single load, so they agree.
    const savedJobTitle = (
      await page.locator('a[href^="/jobs/"]').filter({ hasText: /.+/ }).first().textContent()
    )?.trim();
    expect(savedJobTitle).toBeTruthy();
    // Save/apply controls stay disabled until the client-side personalization
    // fetch reports the real session, so Playwright's actionability wait is
    // enough here — no networkidle hack needed.
    // Compact save buttons set an aria-label ("Save job" / "Unsave job") which
    // overrides the visible "Save" / "Saved" text for accessible-name matching.
    await page.getByRole("button", { name: /^save job$/i }).first().click();
    await expect(page.getByRole("button", { name: /^unsave job$/i }).first()).toBeVisible();

    await page.goto(publicJob.href);
    await page.getByRole("button", { name: /apply now/i }).click();

    // The panel now preselects the newest saved resume, so a re-run against a
    // database that already holds one would not render the upload field. Ask
    // for the upload path explicitly to exercise it every time.
    // The select content portals outside the dialog, so scope the trigger to
    // the dialog but look up the option at page level.
    await page.getByRole("dialog").getByRole("combobox").first().click();
    await page.getByRole("option", { name: /upload new resume/i }).click();

    await page.setInputFiles("#resume-upload", "e2e/fixtures/test-resume.pdf");
    // Match the success copy specifically: the failure alert ("Your resume
    // uploaded, but we could not save it to your library") also contains
    // "resume uploaded", so a looser pattern passed while the upload was broken.
    await expect(page.getByText(/you can submit the application now/i)).toBeVisible();

    // On success the panel hands off to the job's official application URL via
    // window.location.assign, so the "Application submitted" alert is set and
    // then torn down by that navigation — it is never observable. Assert on the
    // API result, and keep the handoff from dragging a third-party site into
    // the run. The tracker check below confirms the application actually stuck.
    await blockCrossOriginNavigation(page);
    const [applyResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          /\/api\/jobs\/[^/]+\/apply$/.test(new URL(response.url()).pathname) &&
          response.request().method() === "POST",
      ),
      page.getByRole("button", { name: /submit application/i }).click(),
    ]);
    // 409 is the "already applied" path, which is a valid outcome on a re-run.
    expect([200, 409]).toContain(applyResponse.status());

    await page.goto("/dashboard/saved-jobs");
    await expect(page.getByRole("heading", { name: /saved jobs/i })).toBeVisible();
    await expect(page.getByText(savedJobTitle!).first()).toBeVisible();

    await page.goto("/dashboard/applications");
    await expect(page.getByRole("heading", { name: /applications tracker/i })).toBeVisible();
    await expect(page.getByText(publicJob.title)).toBeVisible();

    await page.goto("/employer");
    await expect(page).not.toHaveURL(/\/employer$/);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

/**
 * Cancels top-level navigations that leave the app under test, so a handoff to
 * a third-party "apply on the official site" URL cannot stall or fail the run.
 * Sub-resource requests are left alone.
 */
async function blockCrossOriginNavigation(page: Page) {
  const appOrigin = new URL(page.url()).origin;

  await page.route("**/*", async (route) => {
    const request = route.request();

    if (request.isNavigationRequest() && new URL(request.url()).origin !== appOrigin) {
      await route.abort();
      return;
    }

    await route.fallback();
  });
}
