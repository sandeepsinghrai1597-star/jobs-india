import fs from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

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
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /login to jobpulse india/i })).toBeVisible();
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
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
  await expect(page.getByText(/profile updated|candidate profile saved successfully/i)).toBeVisible();
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
  await page.getByLabel("Description").fill("QA role created from Playwright automation.");
  await page.getByLabel("Responsibilities").fill("Write tests\nReview regressions");
  await page.getByLabel("Requirements").fill("Automation experience\nCommunication");
  await page.getByLabel("Openings").fill("2");
  await page.getByLabel("Deadline").fill("2026-12-31");
  await page.getByLabel("Salary min").fill("600000");
  await page.getByLabel("Salary max").fill("850000");
  await page.getByLabel("Application URL optional").fill("https://example.com/employer-apply");
  await page.getByRole("button", { name: /create job post/i }).click();
  await expect(page).toHaveURL(/\/employer\/jobs/);
}

export async function createAdminJob(page: Page, title: string, companyName: string) {
  await page.goto("/admin/jobs/new");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Job title").fill(title);
  await page.getByLabel("Description").fill("Admin-created QA listing for automated moderation testing.");
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
  await expect(page).toHaveURL(/\/admin\/jobs\/review/);
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
