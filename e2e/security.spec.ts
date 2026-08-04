import { expect, test } from "@playwright/test";
import {
  createJobAndGetId,
  createSignedInSession,
  fillCandidateOnboarding,
  fillEmployerOnboarding,
  getFixtures,
  login,
} from "./utils";

test.describe("Security boundaries", () => {
  // The database is no longer reachable from the browser, so profile
  // isolation is enforced by the API scoping every read to the session user.
  test("candidate profile API only ever returns the signed-in candidate", async ({ browser }) => {
    const fixtures = getFixtures();

    const alt = await createSignedInSession(
      browser,
      fixtures.users.candidateAlt.email,
      fixtures.users.candidateAlt.password,
    );
    let altProfile: { userId?: string };
    try {
      await fillCandidateOnboarding(alt.page);
      ({ profile: altProfile } = await (await alt.page.request.fetch("/api/candidate/profile")).json());
    } finally {
      await alt.close();
    }

    const primary = await createSignedInSession(
      browser,
      fixtures.users.candidate.email,
      fixtures.users.candidate.password,
    );
    try {
      await fillCandidateOnboarding(primary.page);

      const response = await primary.page.request.fetch("/api/candidate/profile");
      expect(response.status()).toBe(200);
      const { profile } = await response.json();

      // Same endpoint, different session — it must not return the other user's row.
      expect(altProfile.userId).toBeTruthy();
      expect(profile.userId).not.toBe(altProfile.userId);
    } finally {
      await primary.close();
    }
  });

  test("candidate profile API rejects unauthenticated requests", async ({ request }) => {
    const response = await request.fetch("/api/candidate/profile");
    expect(response.status()).toBe(401);
  });

  test("employer cannot mutate another employer's job", async ({ browser, page }) => {
    const fixtures = getFixtures();
    const altEmployer = await createSignedInSession(
      browser,
      fixtures.users.employerAlt.email,
      fixtures.users.employerAlt.password,
    );
    let altJobId: string;
    try {
      await fillEmployerOnboarding(altEmployer.page);
      altJobId = await createJobAndGetId(
        altEmployer.page,
        `QA Security Alt Employer Role ${Date.now()}`,
      );
    } finally {
      await altEmployer.close();
    }

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
    const candidate = await createSignedInSession(
      browser,
      fixtures.users.candidate.email,
      fixtures.users.candidate.password,
    );
    try {
      await fillCandidateOnboarding(candidate.page);
      await candidate.page.goto("/admin");
      await expect(candidate.page).toHaveURL(/\/dashboard/);
    } finally {
      await candidate.close();
    }

    const employer = await createSignedInSession(
      browser,
      fixtures.users.employer.email,
      fixtures.users.employer.password,
    );
    try {
      await employer.page.goto("/admin");
      await expect(employer.page).toHaveURL(/\/employer/);
    } finally {
      await employer.close();
    }
  });
});
