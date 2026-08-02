import { expect, test } from "@playwright/test";
import { createJobAndGetId, fillCandidateOnboarding, fillEmployerOnboarding, getFixtures, login } from "./utils";

test.describe("Security boundaries", () => {
  // The database is no longer reachable from the browser, so profile
  // isolation is enforced by the API scoping every read to the session user.
  test("candidate profile API only ever returns the signed-in candidate", async ({ browser }) => {
    const fixtures = getFixtures();

    const altPage = await browser.newPage();
    await login(altPage, fixtures.users.candidateAlt.email, fixtures.users.candidateAlt.password);
    await fillCandidateOnboarding(altPage);
    const { profile: altProfile } = await (await altPage.request.fetch("/api/candidate/profile")).json();
    await altPage.close();

    const page = await browser.newPage();
    await login(page, fixtures.users.candidate.email, fixtures.users.candidate.password);
    await fillCandidateOnboarding(page);

    const response = await page.request.fetch("/api/candidate/profile");
    expect(response.status()).toBe(200);
    const { profile } = await response.json();

    // Same endpoint, different session — it must not return the other user's row.
    expect(altProfile.userId).toBeTruthy();
    expect(profile.userId).not.toBe(altProfile.userId);
    await page.close();
  });

  test("candidate profile API rejects unauthenticated requests", async ({ request }) => {
    const response = await request.fetch("/api/candidate/profile");
    expect(response.status()).toBe(401);
  });

  test("employer cannot mutate another employer's job", async ({ page }) => {
    const fixtures = getFixtures();
    const altEmployerPage = await page.context().browser()?.newPage();
    if (!altEmployerPage) {
      throw new Error("Could not create alternate employer page.");
    }
    await login(altEmployerPage, fixtures.users.employerAlt.email, fixtures.users.employerAlt.password);
    await fillEmployerOnboarding(altEmployerPage);
    const altJobId = await createJobAndGetId(
      altEmployerPage,
      `QA Security Alt Employer Role ${Date.now()}`,
    );
    await altEmployerPage.close();

    await login(page, fixtures.users.employer.email, fixtures.users.employer.password);
    await fillEmployerOnboarding(page);

    const response = await page.request.fetch(
      `/api/employer/jobs/${altJobId}`,
      {
        method: "PATCH",
        data: { action: "pause" },
      },
    );

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toMatch(/not found|permission/i);
  });

  test("admin routes are protected for unauthenticated and non-admin users", async ({ browser, page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);

    const fixtures = getFixtures();
    const candidatePage = await browser.newPage();
    await login(candidatePage, fixtures.users.candidate.email, fixtures.users.candidate.password);
    await fillCandidateOnboarding(candidatePage);
    await candidatePage.goto("/admin");
    await expect(candidatePage).toHaveURL(/\/dashboard/);
    await candidatePage.close();

    const employerPage = await browser.newPage();
    await login(employerPage, fixtures.users.employer.email, fixtures.users.employer.password);
    await employerPage.goto("/admin");
    await expect(employerPage).toHaveURL(/\/employer/);
    await employerPage.close();
  });
});
