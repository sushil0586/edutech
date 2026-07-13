import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function searchInput(page: Page) {
  return page.locator('input[type="search"][name="search"]').first();
}

function examFilter(page: Page) {
  return page.locator('select[name="exam_filter"]').first();
}

function examSort(page: Page) {
  return page.locator('select[name="exam_sort"]').first();
}

function attemptFilter(page: Page) {
  return page.locator('select[name="attempt_filter"]').first();
}

function attemptSort(page: Page) {
  return page.locator('select[name="attempt_sort"]').first();
}

function attemptGroup(page: Page) {
  return page.locator('select[name="attempt_group"]').first();
}

function examPageSize(page: Page) {
  return page.locator('select[name="exam_page_size"]').first();
}

function attemptPageSize(page: Page) {
  return page.locator('select[name="attempt_page_size"]').first();
}

async function gotoInstituteSecurity(page: Page, path = "/institute/security") {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();
  await expect(page.getByText(/security controls/i).first()).toBeVisible();
}

test.describe("Institute security workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can inspect security controls, quick filters, and selected-exam watch state", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoInstituteSecurity(page);

    await expect(page.getByText(/^elevated security exams$/i).first()).toBeVisible();
    await expect(page.getByText(/^access-key protected$/i).first()).toBeVisible();
    await expect(page.getByText(/^watchlist attempts$/i).first()).toBeVisible();

    await searchInput(page).fill("math");
    await examFilter(page).selectOption("access_key");
    await examSort(page).selectOption("latest");
    await attemptFilter(page).selectOption("stable");
    await attemptSort(page).selectOption("name");
    await attemptGroup(page).selectOption("health");
    await examPageSize(page).selectOption("12");
    await attemptPageSize(page).selectOption("18");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=math/i);
    await expect(page).toHaveURL(/exam_filter=access_key/);
    await expect(page).toHaveURL(/exam_sort=latest/);
    await expect(page).toHaveURL(/attempt_filter=stable/);
    await expect(page).toHaveURL(/attempt_sort=name/);
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(page).toHaveURL(/exam_page_size=12/);
    await expect(page).toHaveURL(/attempt_page_size=18/);
    await expect(page.getByText(/^exam scope: access key$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: stable$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: health$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /critical attempts/i }).click();
    await expect(page).toHaveURL(/attempt_filter=critical/);

    await page.getByRole("link", { name: /most alerts/i }).click();
    await expect(page).toHaveURL(/attempt_sort=alerts_high/);

    await page.getByRole("link", { name: /group by health/i }).click();
    await expect(page).toHaveURL(/attempt_group=health/);

    await expect(
      page.getByRole("heading", { name: /choose the exam you want to monitor right now/i }),
    ).toBeVisible();

    const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
    if (await watchExamButton.isVisible().catch(() => false)) {
      await watchExamButton.click();
      await expect(page).toHaveURL(/examId=/);
      await expect(page.getByRole("link", { name: /watching/i }).first()).toBeVisible();

      await expect(page.getByRole("heading", { name: /current monitoring totals/i }).first()).toBeVisible();
      await expect(page.getByText(/integrity watchlist/i).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /attempts needing review first/i }).first()).toBeVisible();

      const attemptsPanel = page.locator(".dashboardPanel").filter({
        has: page.getByRole("heading", { name: /attempts needing review first/i }),
      }).first();
      const groupedAttemptRows = attemptsPanel.locator(".workspaceResultsGroup .weakTopicRow");
      if (await groupedAttemptRows.first().isVisible().catch(() => false)) {
        const firstAttemptMeta = ((await groupedAttemptRows.first().locator(".weakTopicMeta strong").textContent()) ?? "").trim();
        if (firstAttemptMeta) {
          await expect(
            attemptsPanel
              .locator(".sectionHeading strong")
              .filter({ hasText: new RegExp(`^${firstAttemptMeta}$`, "i") })
              .first(),
          ).toBeVisible();
        }
      }

      await attemptGroup(page).selectOption("status");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/attempt_group=status/);
      await expect(page.getByText(/^group: status$/i).first()).toBeVisible();
      await expect(page).toHaveURL(/examId=/);
    } else {
      await expect(
        page.getByText(/no institute exams were returned for security oversight|no exams match the current selector filters/i).first(),
      ).toBeVisible();
    }

    await page.getByRole("navigation", { name: /institute admin navigation/i }).getByRole("link", { name: /^exams$/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await gotoInstituteSecurity(page);
    await page.getByRole("navigation", { name: /institute admin navigation/i }).getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^results$/i }).first()).toBeVisible();

    await gotoInstituteSecurity(page);
    const resetHref = await page.getByRole("link", { name: /reset filters/i }).getAttribute("href");
    expect(resetHref).toBeTruthy();
    await page.goto(resetHref!);
    await expect(page).toHaveURL(/\/institute\/security(?:\?examId=.*)?$/);
    await expect(page.getByText(/^exam scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: none$/i).first()).toBeVisible();
  });
});
