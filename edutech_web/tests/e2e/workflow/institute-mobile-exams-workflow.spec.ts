import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

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

async function gotoInstituteExamsWorkspace(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await gotoWithRuntimeRecovery(page, "/institute/exams");
    const workspaceHeading = page.getByRole("heading", { name: /exam management/i }).first();
    if (await workspaceHeading.isVisible().catch(() => false)) {
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }

    const loadFailureHeading = page.getByRole("heading", {
      name: /this page couldn’t load|this page couldn't load/i,
    });
    if (attempt < 3 && (await loadFailureHeading.isVisible().catch(() => false))) {
      continue;
    }

    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(workspaceHeading).toBeVisible();
  }
}

async function openMobileInstituteNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  const mobileMenu = page.locator("#mobile-workspace-menu");
  if (await mobileMenu.isVisible().catch(() => false)) {
    return mobileMenu;
  }
  return page.locator("main");
}

async function expectInstituteExamsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();
}

test.describe("Institute mobile exams workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute mobile viewport supports exam workspace controls and handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();

    const mobileNav = await openMobileInstituteNav(page);
    await expect(mobileNav.getByRole("link", { name: /^exams$/i }).first()).toBeVisible();
    await gotoInstituteExamsWorkspace(page);
    await expectInstituteExamsWorkspace(page);

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });

    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expect(page.getByText(/open academic setup/i).first()).toBeVisible();

      await page.getByRole("link", { name: /advanced builder/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams\/advanced(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

      await gotoInstituteExamsWorkspace(page);
      await expectInstituteExamsWorkspace(page);

      await page.getByRole("link", { name: /quick create/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams\/new(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      return;
    }

      await expect(page.getByText(/how to use this workspace/i).first()).toBeVisible();

    await page.getByRole("combobox", { name: /^status$/i }).selectOption("live");
    await page.getByRole("combobox", { name: /sort/i }).selectOption("start_soon");
    await page.getByRole("combobox", { name: /group/i }).selectOption("subject");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("18");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/exam_status=live/);
    await expect(page).toHaveURL(/exam_sort=start_soon/);
    await expect(page).toHaveURL(/exam_group=subject/);
    await expect(page).toHaveURL(/exam_page_size=18/);
    await expect(page.getByText(/^status: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^sort: start soon$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: subject$/i).first()).toBeVisible();

    const emptyFilteredState = page.getByText(/no exams match the current controls/i).first();
    if (await emptyFilteredState.isVisible().catch(() => false)) {
      await expect(emptyFilteredState).toBeVisible();
      await expect(
        page.getByRole("link", { name: /clear all controls and show all exams/i }).first(),
      ).toBeVisible();
      await page.getByRole("link", { name: /clear all controls and show all exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      await expectInstituteExamsWorkspace(page);
    } else {
      const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
      await expect(openExamLink).toBeVisible();
      await openExamLink.click();

      await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByText(/exam code/i).first()).toBeVisible();
      const openBuilderLink = page.getByRole("link", { name: /open builder/i }).first();
      await expect(openBuilderLink).toBeVisible();
      await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();

      const openBuilderHref = await openBuilderLink.getAttribute("href");
      expect(openBuilderHref).toMatch(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
      await page.goto(openBuilderHref!);
      await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
      await expect(page.getByText(/paper design/i).first()).toBeVisible();
    }

    await gotoInstituteExamsWorkspace(page);
    await expectInstituteExamsWorkspace(page);

    await page.getByRole("link", { name: /preset library/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/preset-packs(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
  });
});
