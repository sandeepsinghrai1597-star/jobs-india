import { expect, test } from "@playwright/test";
import {
  createJobAndGetId,
  createSignedInSession,
  fillEmployerOnboarding,
  getFixtures,
  login,
  saveDebugScreenshot,
} from "./utils";

test.describe("Employer flows", () => {
  test("employer signup/login, onboarding, posting, editing, and applicants work", async ({
    browser,
    page,
  }) => {
    const fixtures = getFixtures();

    await page.goto("/signup");
    const employerEmail = `employer.signup.${Date.now()}@example.com`;
    await page.getByRole("button", { name: /employer/i }).click();
    await page.getByLabel("Full Name").fill("Signup Employer");
    await page.getByLabel("Email Address").fill(employerEmail);
    await page.getByLabel("Phone Number").fill("+91 9000005678");
    await page.getByLabel("Password").fill("JobPulse123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/check your email|employer dashboard|workspace overview/i)).toBeVisible();

    await login(page, fixtures.users.employer.email, fixtures.users.employer.password);
    await expect(page).toHaveURL(/\/employer/);

    await fillEmployerOnboarding(page);
    await page.goto("/employer");
    await expect(page.getByRole("heading", { name: /employer dashboard/i })).toBeVisible();
    await saveDebugScreenshot(page, "employer-dashboard");

    const newJobTitle = `QA Employer Posted Role ${Date.now()}`;
    const createdJobId = await createJobAndGetId(page, newJobTitle);
    await expect(page.getByText(newJobTitle)).toBeVisible();

    await page.goto(`/employer/jobs/${createdJobId}/edit`);
    await expect(page.getByRole("heading", { name: /edit job/i })).toBeVisible();
    await page.getByLabel("Job title").fill(`${newJobTitle} Updated`);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/job updated successfully|job updated and sent for approval/i)).toBeVisible();

    const altEmployer = await createSignedInSession(
      browser,
      fixtures.users.employerAlt.email,
      fixtures.users.employerAlt.password,
    );
    let altJobId: string;
    try {
      await fillEmployerOnboarding(altEmployer.page);
      altJobId = await createJobAndGetId(altEmployer.page, `QA Alt Employer Role ${Date.now()}`);
    } finally {
      await altEmployer.close();
    }

    // The edit page scopes its lookup to the signed-in employer's profile and
    // calls notFound() on a miss. Next renders the 404 route in place: same URL,
    // and a 200 status because the shell has already begun streaming. Both a
    // redirect assertion and a status assertion therefore fail against correct
    // behaviour — assert on what actually rendered.
    await page.goto(`/employer/jobs/${altJobId}/edit`);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
    await expect(page.getByLabel("Job title")).toHaveCount(0);

    await page.goto("/employer/applicants");
    await expect(page.getByRole("heading", { name: /applicants/i })).toBeVisible();
    // The page intro ("Review candidates, shortlist...") also matches, so scope
    // to the first hit rather than tripping strict mode.
    await expect(page.getByText(/candidate|applicants will appear here/i).first()).toBeVisible();

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
    await expect(page).toHaveURL(/\/employer/);
  });
});
