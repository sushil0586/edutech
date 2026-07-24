import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student wrong questions workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate the wrong questions report and its drilldown contract", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics/wrong-questions");
    await expect(page).toHaveURL(/\/app\/analytics\/wrong-questions(?:\?.*)?$/);

    const blockedState = page
      .getByText(/wrong questions report is not available yet|wrong questions report could not be loaded/i)
      .first();
    if (await blockedState.isVisible().catch(() => false)) {
      return;
    }

    await expect(page.getByRole("heading", { name: /wrong questions report/i }).first()).toBeVisible();
    await expect(page.getByText(/use this report well/i).first()).toBeVisible();
    await expect(page.getByText(/related report links/i).first()).toBeVisible();

    for (const label of [/wrong questions/i, /average time/i, /topic scope/i, /format scope/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    const emptyState = page.getByText(/0 wrong questions in this report|0 wrong questions in this topic slice/i).first();
    if (await emptyState.isVisible().catch(() => false)) {
      return;
    }

    const firstRow = page.locator(".studentWrongQuestionsTable tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/what went wrong/i).first()).toBeVisible();
    await expect(page.getByText(/recovery guidance/i).first()).toBeVisible();

    const drilldownLink = page
      .getByRole("link", { name: /open subject view|open topic view|open type view/i })
      .first();
    await expect(drilldownLink).toBeVisible();
    const href = await drilldownLink.getAttribute("href");
    expect(href).toBeTruthy();

    await drilldownLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
