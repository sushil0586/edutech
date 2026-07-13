import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function firstHref(locator: Locator) {
  const href = await locator.first().getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

async function expectVisibleOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.locator("option").count()).toBeGreaterThan(0);
}

async function openQuestionDetailHref(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/question-bank");
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

  const editLink = page.getByRole("link", { name: /edit|duplicate to edit/i });
  await expect(editLink.first()).toBeVisible();
  return firstHref(editLink);
}

async function openComprehensionDetailHref(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/question-bank");
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

  const setLink = page.getByRole("link", { name: /open set/i });
  const count = await setLink.count();
  if (count === 0) {
    return null;
  }

  await expect(setLink.first()).toBeVisible();
  return firstHref(setLink);
}

test.describe("Institute route gap baseline coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute baseline covers settings, search, preset packs, and security routes directly", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByText(/dli001 settings|settings$/i).first()).toBeVisible();
    await expect(page.getByText(/settings foundation is live/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage exam defaults/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/search");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(page.getByText(/search shortcuts, pages, and workspace actions/i).first()).toBeVisible();
    const workspaceSearchField = page.getByRole("searchbox", { name: /^search$/i });
    const sectionSelect = page.getByRole("combobox", { name: /^section$/i });
    const sourceSelect = page.getByRole("combobox", { name: /^source$/i });
    const sortSelect = page.getByRole("combobox", { name: /^sort by$/i });
    const groupSelect = page.getByRole("combobox", { name: /^group by$/i });
    await expect(workspaceSearchField).toBeVisible();
    await expectVisibleOptions(sectionSelect);
    await expectVisibleOptions(sourceSelect);
    await expectVisibleOptions(sortSelect);
    await expectVisibleOptions(groupSelect);

    await workspaceSearchField.fill("exam");
    await sourceSelect.selectOption("catalog");
    await groupSelect.selectOption("section");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/search\?/);
    await expect(page).toHaveURL(/q=exam/);
    await expect(page).toHaveURL(/source=catalog/);
    await expect(page).toHaveURL(/group=section/);
    await expect(page.getByRole("link", { name: /workspace pages/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/exams/preset-packs");
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
    await expect(page.getByText(/search the library and move into builder/i).first()).toBeVisible();
    const presetSearch = page.getByRole("textbox", { name: /search preset packs/i });
    await expect(presetSearch).toBeVisible();
    await presetSearch.fill("starter");
    await expect(presetSearch).toHaveValue("starter");
    await expect(page.getByRole("link", { name: /open advanced builder/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /managed/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/security");
    await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();

    const securityControls = page.getByText(/security controls/i).first();
    if (await securityControls.isVisible().catch(() => false)) {
      const securitySearchField = page.getByRole("searchbox", { name: /^search$/i });
      const examFilterSelect = page.getByRole("combobox", { name: /exam filter/i });
      const attemptFilterSelect = page.getByRole("combobox", { name: /attempt filter/i });
      const attemptGroupSelect = page.getByRole("combobox", { name: /group attempts/i });
      await expect(securitySearchField).toBeVisible();
      await expectVisibleOptions(examFilterSelect);
      await expectVisibleOptions(attemptFilterSelect);
      await examFilterSelect.selectOption("elevated");
      await attemptGroupSelect.selectOption("health");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/exam_filter=elevated/);
      await expect(page).toHaveURL(/attempt_group=health/);
    } else {
      await expect(
        page.getByText(/waiting for institute security visibility|security data could not be loaded/i).first(),
      ).toBeVisible();
    }
  });

  test("@workflow institute can reopen question and comprehension detail routes from direct browser URLs", async ({
    page,
  }) => {
    const questionHref = await openQuestionDetailHref(page);
    await gotoWithRuntimeRecovery(page, questionHref);
    await expect(page).toHaveURL(/\/institute\/question-bank\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question|duplicate question/i }).first()).toBeVisible();
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
    await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to question bank|back to bank/i }).first()).toBeVisible();

    const comprehensionHref = await openComprehensionDetailHref(page);
    if (!comprehensionHref) {
      test.info().annotations.push({
        type: "coverage-note",
        description: "No comprehension rows were available in the current institute dataset for direct detail-route proof.",
      });
      return;
    }

    await gotoWithRuntimeRecovery(page, comprehensionHref);
    await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
    await expect(page.getByText(/next step/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create linked question/i }).first()).toBeVisible();
  });

  test("@workflow institute can open comprehension creation directly and validate the entry surface", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank/comprehension/new");
    await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();
    await expect(page.getByText(/institute-scoped comprehension content/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /create comprehension set/i })).toBeVisible();

    const programSelect = page.locator('select[name="program"]').first();
    const subjectSelect = page.locator('select[name="subject"]').first();
    await expect(programSelect).toBeVisible();
    await expect(subjectSelect).toBeDisabled();

    await page.getByRole("button", { name: /create comprehension set/i }).click();
    await expect(
      page.getByText(/program|subject|topic|title|passage/i).first(),
    ).toBeVisible();
  });
});
