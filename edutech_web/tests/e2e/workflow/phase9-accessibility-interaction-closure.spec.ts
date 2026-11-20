import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectFocusInside(dialog: Locator, page: Page) {
  await expect
    .poll(async () => dialog.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);
  await expect(page.locator(":focus")).toBeVisible();
}

test.describe("Phase 9 accessibility interaction closure", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("student and teacher dialogs manage focus, validation and return focus", async ({ page }) => {
    await loginAsRole(page, "institute");
    await gotoWithRuntimeRecovery(page, "/institute/people?view=students");

    const studentTrigger = page.getByRole("button", { name: /create student/i });
    await studentTrigger.focus();
    await studentTrigger.click();
    let dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expectFocusInside(dialog, page);
    await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expectFocusInside(dialog, page);
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();

    await dialog.getByRole("button", { name: /^create student$/i }).click();
    const admission = dialog.getByLabel(/admission no/i);
    await expect(admission).toBeFocused();
    await expect(admission).toHaveAttribute("aria-invalid", "true");
    const describedBy = await admission.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText(/admission number is required/i);
    await expect(page.getByRole("status")).toContainText(/fill the required fields/i);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(studentTrigger).toBeFocused();

    await page.getByRole("link", { name: /^teachers$/i }).first().click();
    await expect(page).toHaveURL(/view=teachers/);
    const teacherTrigger = page.getByRole("button", { name: /create teacher/i });
    await teacherTrigger.click();
    dialog = page.getByRole("dialog");
    await expectFocusInside(dialog, page);
    await dialog.getByRole("button", { name: /^create teacher$/i }).click();
    const employeeCode = dialog.getByLabel(/employee code/i);
    await expect(employeeCode).toBeFocused();
    await expect(employeeCode).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Escape");
    await expect(teacherTrigger).toBeFocused();
  });

  test("loading feedback is live and dense roster table is keyboard-scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await loginAsRole(page, "admin");
    await gotoWithRuntimeRecovery(page, "/admin/people?view=students");

    await page.route("**/api/admin/people/workspace?**", async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ response });
    });
    await page.getByRole("button", { name: /update view/i }).click();
    const loadingStatus = page.locator('[role="status"]').filter({ hasText: /loading people workspace/i });
    await expect(loadingStatus).toBeVisible();
    await expect(loadingStatus).toHaveAttribute("aria-live", "polite");
    await expect(loadingStatus).toBeHidden();

    const tableRegion = page.getByRole("region", { name: /student roster table/i });
    await tableRegion.focus();
    await expect(tableRegion).toBeFocused();
    const before = await tableRegion.evaluate((element) => element.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });

  test("parent empty state remains contained and understandable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await loginAsRole(page, "parent");
    await gotoWithRuntimeRecovery(page, "/parent/progress");
    await expect(page.getByRole("heading", { name: /academic progress/i })).toBeVisible();
    await expect(page.getByText(/no child with progress visibility is available/i)).toBeVisible();
    await expect(page.getByText(/waiting for progress-enabled link/i)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });
});
