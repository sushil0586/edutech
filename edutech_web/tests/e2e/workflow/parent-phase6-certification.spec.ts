import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

test.describe("Phase 6 parent certification", () => {
  test.skip(testRequiresRole("parent"), "Parent Playwright credentials are not configured.");

  test("@workflow EDU-PARN-001 EDU-PARN-003 EDU-PARN-004 scopes two linked children independently", async ({ page }) => {
    await loginAsRole(page, "parent");
    await page.goto("/parent/children");

    await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mira Sharma" })).toBeVisible();
    await expect(page.getByText("P6P-20261119-CHILD2")).toBeVisible();

    await page.getByRole("link", { name: "View Progress" }).first().click();
    await expect(page).toHaveURL(/\/parent\/progress\?child_id=/);
    await expect(page.getByText(/Aarav Sharma performance trend/i)).toBeVisible();
    await expect(page.getByText("Mathematics Weekly Test")).toBeVisible();

    await page.getByRole("link", { name: "Mira Sharma" }).click();
    await expect(page.getByText(/Mira Sharma performance trend/i)).toBeVisible();
    await expect(page.getByText(/Published exam results will appear here/i)).toBeVisible();
  });

  test("@workflow EDU-PARN-005 persists alert read state after refresh", async ({ page }) => {
    await loginAsRole(page, "parent");
    await page.goto("/parent/alerts");

    const alert = page.locator(".weakTopicRow").filter({
      has: page.getByText("Mathematics score needs attention", { exact: true }),
    });
    await expect(alert).toBeVisible();
    const markRead = alert.getByRole("button", { name: "Mark Read" });
    if (await markRead.isVisible().catch(() => false)) {
      await markRead.click();
      await expect(page.getByText("Alert marked as Read.")).toBeVisible();
    } else {
      await expect(alert).toContainText("Status: Read");
    }

    await page.reload();
    await expect(
      page.locator(".weakTopicRow").filter({
        has: page.getByText("Mathematics score needs attention", { exact: true }),
      }),
    ).toContainText("Status: Read");
    await page.goto("/parent/alerts?status=read");
    await expect(page.getByText("Mathematics score needs attention")).toBeVisible();
  });

  test("@workflow EDU-PARN-006 persists notification preferences", async ({ page }) => {
    await loginAsRole(page, "parent");
    await page.goto("/parent/settings");

    const weeklySummary = page.getByRole("checkbox", { name: /Weekly summary digest/i });
    const nextValue = !(await weeklySummary.isChecked());
    await weeklySummary.setChecked(nextValue);
    await page.getByRole("button", { name: "Save Preferences" }).click();
    await expect(page.getByText("Parent preferences updated successfully.")).toBeVisible();

    await page.goto("/parent/dashboard");
    await page.goto("/parent/settings");
    await expect(page.getByRole("checkbox", { name: /Weekly summary digest/i })).toBeChecked({ checked: nextValue });
  });

  test("@workflow EDU-PARN-002 EDU-PARN-008 renders a recoverable out-of-scope error state", async ({ page }) => {
    await loginAsRole(page, "parent");
    await page.goto("/parent/progress?child_id=00000000-0000-0000-0000-000000000000");

    await expect(page.getByRole("heading", { name: "Progress data could not be loaded" })).toBeVisible();
    await expect(page.getByText(/did not return successfully/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Children" })).toBeVisible();
  });

  test("@workflow @a11y EDU-PARN-008 supports 320px reflow and keyboard settings control", async ({ page, browserName }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await loginAsRole(page, "parent");
    await page.goto("/parent/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("checkbox", { name: /Score drop alerts/i }).focus();
    await expect(page.getByRole("checkbox", { name: /Score drop alerts/i })).toBeFocused();
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(page.getByRole("checkbox", { name: /Inactivity alerts/i })).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("@workflow EDU-PARN-007 renders an empty scope after relationship revocation", async ({ page }) => {
    test.skip(process.env.PHASE6_REVOKED_SCOPE !== "1", "Requires the bounded revoked-scope fixture state.");
    await loginAsRole(page, "parent");
    await page.goto("/parent/children");

    await expect(page.getByRole("heading", { name: "No child relationships are active yet" })).toBeVisible();
    await expect(page.getByText("Waiting for active links")).toBeVisible();
  });
});
