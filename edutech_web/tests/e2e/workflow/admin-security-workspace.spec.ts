import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin security workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect security controls, quick filters, and exam watch state", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/security");

    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
    await expect(page.getByText(/security controls/i).first()).toBeVisible();
    await expect(page.locator('a[href="/admin"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();

    const searchInput = page.locator('input[type="search"][name="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("aws");

    const examFilter = page.locator('select[name="exam_filter"]').first();
    const examSort = page.locator('select[name="exam_sort"]').first();
    const attemptFilter = page.locator('select[name="attempt_filter"]').first();
    const attemptSort = page.locator('select[name="attempt_sort"]').first();
    const attemptGroup = page.locator('select[name="attempt_group"]').first();
    const examPageSize = page.locator('select[name="exam_page_size"]').first();
    const attemptPageSize = page.locator('select[name="attempt_page_size"]').first();

    await examFilter.selectOption("live");
    await examSort.selectOption("latest");
    await attemptFilter.selectOption("watch");
    await attemptSort.selectOption("alerts_high");
    await attemptGroup.selectOption("health");
    await examPageSize.selectOption("12");
    await attemptPageSize.selectOption("18");

    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/exam_filter=live/);
    await expect(page).toHaveURL(/exam_sort=latest/);
    await expect(page).toHaveURL(/attempt_filter=watch/);
    await expect(page).toHaveURL(/attempt_sort=alerts_high/);
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(page).toHaveURL(/exam_page_size=12/);
    await expect(page).toHaveURL(/attempt_page_size=18/);
    await expect(page).toHaveURL(/search=aws/i);
    await expect(page.getByText(/exam page: 1\//i)).toBeVisible();
    await expect(page.getByText(/attempt page: 1\//i)).toBeVisible();
    await expect(page.getByText(/^exam scope: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: watch$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: health$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /critical attempts/i }).click();
    await expect(page).toHaveURL(/attempt_filter=critical/);

    await page.getByRole("link", { name: /most alerts/i }).click();
    await expect(page).toHaveURL(/attempt_sort=alerts_high/);

    await page.getByRole("link", { name: /group by health/i }).click();
    await expect(page).toHaveURL(/attempt_group=health/);

    const examSelectorPanel = page.getByRole("heading", { name: /choose the exam you want to monitor right now/i });
    await expect(examSelectorPanel).toBeVisible();

    const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
    await expect(watchExamButton).toBeVisible();
    await watchExamButton.click();
    await expect(page).toHaveURL(/examId=/);
    await expect(page.getByRole("link", { name: /watching/i }).first()).toBeVisible();

    await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
    await expect(page.getByText(/live monitor summary/i).first()).toBeVisible();
    await expect(page.getByText(/attempt watchlist/i).first()).toBeVisible();
    await expect(page.getByText(/in-progress students/i).first()).toBeVisible();
    await expect(page.getByText(/alerted attempts/i).first()).toBeVisible();

    const attemptWatchlistPanel = page.locator(".dashboardPanel").filter({
      has: page.getByRole("heading", { name: /attempts needing attention in the selected exam/i }),
    });
    const groupedAttemptRows = attemptWatchlistPanel.locator(".workspaceResultsGroup .weakTopicRow");
    if (await groupedAttemptRows.first().isVisible().catch(() => false)) {
      const firstAttemptMeta = ((await groupedAttemptRows.first().locator(".weakTopicMeta strong").textContent()) ?? "").trim();
      if (firstAttemptMeta) {
        await expect(
          attemptWatchlistPanel
            .locator(".sectionHeading strong")
            .filter({ hasText: new RegExp(`^${firstAttemptMeta}$`, "i") })
            .first(),
        ).toBeVisible();
      }
    }

    await attemptGroup.selectOption("status");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/attempt_group=status/);
    await expect(page.getByText(/^group: status$/i).first()).toBeVisible();
    await expect(page).toHaveURL(/examId=/);

    const statusGroupedAttemptRows = attemptWatchlistPanel.locator(".workspaceResultsGroup .weakTopicRow");
    if (await statusGroupedAttemptRows.first().isVisible().catch(() => false)) {
      const statusSummary = ((await statusGroupedAttemptRows.first().locator("div span").nth(1).textContent()) ?? "").trim();
      const expectedStatusHeading = statusSummary.split("·")[0]?.trim();
      if (expectedStatusHeading) {
        await expect(
          attemptWatchlistPanel
            .locator(".sectionHeading strong")
            .filter({ hasText: new RegExp(`^${expectedStatusHeading}$`, "i") })
            .first(),
        ).toBeVisible();
      }
    }

    await page.locator('a[href="/admin"]').first().click();
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await expectAdminWorkspace(page);

    await page.goto("/admin/security");
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/settings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();

    await page.goto("/admin/security");
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?examId=.*)?$/);
    await expect(page.getByText(/^exam scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: none$/i).first()).toBeVisible();
  });
});
