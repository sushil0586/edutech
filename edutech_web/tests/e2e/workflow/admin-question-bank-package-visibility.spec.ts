import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin question-bank operator visibility", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect package scope and institute entitlement visibility", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");

    await expect(
      page.getByRole("heading", { name: /inspect package scope and institute access before changing subscription controls/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /create and edit question-bank packages and scope coverage/i }),
    ).toBeVisible();
    await expect(page.getByText(/question-bank packages/i).first()).toBeVisible();
    await expect(page.getByText(/institute question entitlements/i).first()).toBeVisible();
    await expect(page.getByText(/institute feature entitlements/i).first()).toBeVisible();
    await expect(page.getByText(/package family/i).first()).toBeVisible();
    await expect(
      page.locator(".weakTopicRow").filter({ hasText: /demo shared library access/i }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".weakTopicRow").filter({ hasText: /DLI001|PUBDLI1/i }).first(),
    ).toBeVisible();
    await expect(page.getByText(/status:/i).first()).toBeVisible();
    await expect(page.getByText(/subjects:|programs:/i).first()).toBeVisible();
    await expect(page.getByText(/recommended for:/i).first()).toBeVisible();
    await expect(page.getByText(/default\/linked plans/i).first()).toBeVisible();
    await expect(page.getByText(/lifecycle window:/i).first()).toBeVisible();
  });
});
