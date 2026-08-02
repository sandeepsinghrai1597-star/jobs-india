import { expect, test } from "@playwright/test";
import { firstPublicJob, saveDebugScreenshot, searchJob } from "./utils";

test.describe("Guest journeys", () => {
  test("homepage loads and public job search works", async ({ page }) => {
    await page.goto("/");

    // Assert the page has a level-1 heading rather than pinning exact marketing
    // copy — the previous assertion was left behind by a hero rewrite and
    // failed on every run.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const job = await firstPublicJob(page);
    await searchJob(page, job.title.split(" ").slice(0, 2).join(" "));
    await expect(page.getByText(job.title)).toBeVisible();
    await saveDebugScreenshot(page, "guest-search-results");
  });

  test("job detail opens and guest save/apply redirect to login", async ({ page }) => {
    const job = await firstPublicJob(page);
    await page.goto(job.href);

    await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
    await saveDebugScreenshot(page, "guest-job-detail");

    // The detail page also renders related-job cards, each with its own save
    // button, so target the first match rather than tripping strict mode.
    await page.getByRole("button", { name: /save job/i }).first().click();
    await expect(page).toHaveURL(/\/login\?next=\/jobs\//);

    await page.goto(job.href);
    await page.getByRole("button", { name: /apply now/i }).first().click();
    await expect(page).toHaveURL(/\/login\?next=\/jobs\//);
  });
});
