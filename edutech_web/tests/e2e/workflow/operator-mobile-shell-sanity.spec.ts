import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAdminWorkspace,
  expectInstituteWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function openMobileWorkspaceNav(page: Page, ariaLabel: RegExp, panelId: string) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: ariaLabel })).toBeVisible();
  await expect(page.locator(`#${panelId}`)).toBeVisible();
  return page.locator(`#${panelId}`);
}

async function selectFirstNonEmptyOption(
  locator: import("@playwright/test").Locator,
) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  const firstValue = values[0] ?? null;
  expect(firstValue).not.toBeNull();
  await locator.selectOption(firstValue!);
}

test.describe("Operator mobile shell sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute") || testRequiresRole("teacher"),
    "Admin, institute, and teacher Playwright credentials are required.",
  );

  test("@workflow admin mobile viewport keeps dense economy and security routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /platform admin navigation/i, "mobile-workspace-menu");
    await expect(mobileNav.getByRole("link", { name: /^economy$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^security$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reports$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^economy$/i }).click();
    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    await expect(page.getByText(/scope the page before reviewing data/i).first()).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /platform admin navigation/i, "mobile-workspace-menu");
    await reopenedNav.getByRole("link", { name: /^security$/i }).click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
    await expect(page.getByText(/security controls/i).first()).toBeVisible();
    await expect(page.getByText(/selected exam posture|live monitor summary/i).first()).toBeVisible();

    const searchInput = page.locator('input[type="search"][name="search"]').first();
    const examFilter = page.locator('select[name="exam_filter"]').first();
    const attemptFilter = page.locator('select[name="attempt_filter"]').first();
    const attemptGroup = page.locator('select[name="attempt_group"]').first();
    await expect(searchInput).toBeVisible();
    await expect(examFilter).toBeVisible();
    await expect(attemptFilter).toBeVisible();
    await expect(attemptGroup).toBeVisible();

    await searchInput.fill("aws");
    await examFilter.selectOption("live");
    await attemptFilter.selectOption("watch");
    await attemptGroup.selectOption("health");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=aws/i);
    await expect(page).toHaveURL(/exam_filter=live/);
    await expect(page).toHaveURL(/attempt_filter=watch/);
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(page.getByText(/^exam scope: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: watch$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: health$/i).first()).toBeVisible();
  });

  test("@workflow institute mobile viewport keeps dense economy and review routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /institute admin navigation/i, "mobile-workspace-menu");
    await expect(mobileNav.getByRole("link", { name: /^economy$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^security$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^economy$/i }).click();
    await expect(page).toHaveURL(/\/institute\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /economy oversight/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /packages currently available to this institute/i })).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /institute admin navigation/i, "mobile-workspace-menu");
    await expect(reopenedNav.getByRole("link", { name: /^question bank$/i })).toBeVisible();
    await reopenedNav.getByRole("link", { name: /^question bank$/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill("playwright-no-match-mobile-1781");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show all questions/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /reset filters and show all questions/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);

    await page.getByRole("link", { name: /create question/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
    const questionProgramSelect = page.locator('select[name="program"]');
    const questionSubjectSelect = page.locator('select[name="subject"]');
    await expect(questionSubjectSelect).toBeDisabled();
    await selectFirstNonEmptyOption(questionProgramSelect);
    await expect(questionSubjectSelect).toBeEnabled();

    const reviewNav = await openMobileWorkspaceNav(page, /institute admin navigation/i, "mobile-workspace-menu");
    await reviewNav.getByRole("link", { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage/i).first()).toBeVisible();
  });

  test("@workflow teacher mobile viewport keeps dense results and review routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /teacher navigation/i, "mobile-teacher-menu");
    await expect(mobileNav.getByRole("link", { name: /^results$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^question bank$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /teacher navigation/i, "mobile-teacher-menu");
    await reopenedNav.getByRole("link", { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage|one-click grading views/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("in_review");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("24");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/status=in_review/);
    await expect(page).toHaveURL(/page_size=24/);
    await expect(page.getByText(/status: in review/i).first()).toBeVisible();
    await expect(page.getByText(/page size: 24 tasks/i).first()).toBeVisible();

    await page.getByRole("textbox", { name: /^search$/i }).fill("playwright-no-teacher-review-match-mobile-1943");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=playwright-no-teacher-review-match-mobile-1943/);
    await expect(page.getByText(/no review tasks match these filters/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show full queue/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /reset filters and show full queue/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  });
});
