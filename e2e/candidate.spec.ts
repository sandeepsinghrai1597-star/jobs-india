import { expect, test } from "@playwright/test";
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
    // Job cards start with isSignedIn=false and learn the real session from a
    // client-side personalization fetch. Clicking before that settles routes to
    // /login, which bounces an authenticated user to their dashboard.
    await page.waitForLoadState("networkidle");
    // Compact save buttons set an aria-label ("Save job" / "Unsave job") which
    // overrides the visible "Save" / "Saved" text for accessible-name matching.
    await page.getByRole("button", { name: /^save job$/i }).first().click();
    await expect(page.getByRole("button", { name: /^unsave job$/i }).first()).toBeVisible();

    await page.goto(publicJob.href);
    await page.getByRole("button", { name: /apply now/i }).click();
    await page.setInputFiles("#resume-upload", "e2e/fixtures/test-resume.pdf");
    await expect(page.getByText(/resume uploaded/i)).toBeVisible();
    await page.getByRole("button", { name: /submit application/i }).click();
    await expect(page.getByText(/application submitted successfully|already applied/i)).toBeVisible();

    await page.goto("/dashboard/saved-jobs");
    await expect(page.getByRole("heading", { name: /saved jobs/i })).toBeVisible();
    await expect(page.getByText(publicJob.title)).toBeVisible();

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
