import { expect, test } from "@playwright/test";
import { createAdminJob, getFixtures, login, saveDebugScreenshot } from "./utils";

test.describe("Admin flows", () => {
  test("admin can create, approve, reject, and feature jobs", async ({ page }) => {
    const adminCreatedTitle = `QA Admin Created Role ${Date.now()}`;
    const approveTitle = `QA Admin Approve Role ${Date.now()}`;
    const rejectTitle = `QA Admin Reject Role ${Date.now()}`;

    const fixtures = getFixtures();
    await login(page, fixtures.users.admin.email, fixtures.users.admin.password);
    await expect(page).toHaveURL(/\/admin/);

    await createAdminJob(page, adminCreatedTitle, "JobPulse QA Admin Create Co");
    await createAdminJob(page, approveTitle, "JobPulse QA Approve Co");
    await createAdminJob(page, rejectTitle, "JobPulse QA Reject Co");

    await page.goto(`/admin/jobs/review?tab=pending&q=${encodeURIComponent(adminCreatedTitle)}`);
    await expect(page.getByText(adminCreatedTitle)).toBeVisible();
    await saveDebugScreenshot(page, "admin-pending-created-job");

    await page.goto(`/admin/jobs/review?tab=pending&q=${encodeURIComponent(approveTitle)}`);
    const approveCard = page.locator("div,article").filter({
      has: page.getByText(approveTitle),
    });
    await approveCard.getByRole("button", { name: /^approve$/i }).first().click();
    await page.goto(`/jobs?keyword=${encodeURIComponent(approveTitle)}`);
    // Match the result link specifically: the search page also echoes the term
    // in a "Keyword: ..." badge, so a plain text match is ambiguous and would
    // pass even when no job is listed.
    await expect(page.getByRole("link", { name: approveTitle })).toBeVisible();

    await page.goto(`/admin/jobs/review?tab=pending&q=${encodeURIComponent(rejectTitle)}`);
    const rejectCard = page.locator("div,article").filter({
      has: page.getByText(rejectTitle),
    });
    await rejectCard.getByRole("button", { name: /^reject$/i }).first().click();
    await page.goto(`/jobs?keyword=${encodeURIComponent(rejectTitle)}`);
    // Same reason as above — the keyword badge always contains the title, so
    // this must assert on the absence of a result link, not of the text.
    await expect(page.getByRole("link", { name: rejectTitle })).toHaveCount(0);

    await page.goto(`/admin/jobs/review?tab=active&q=${encodeURIComponent(approveTitle)}`);
    const featureCard = page.locator("div,article").filter({
      has: page.getByText(approveTitle),
    });
    await featureCard.getByRole("button", { name: /mark featured|unfeature/i }).first().click();
    await expect(featureCard.getByText(/featured/i)).toBeVisible();

    await page.goto(`/jobs?keyword=${encodeURIComponent(approveTitle)}`);
    await expect(page.getByText(/featured/i).first()).toBeVisible();
    await saveDebugScreenshot(page, "admin-featured-public-job");
  });
});
