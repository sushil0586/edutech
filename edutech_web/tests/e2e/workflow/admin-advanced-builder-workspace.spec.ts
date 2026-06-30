import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin advanced exam builder workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect advanced builder controls and preset governance lanes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/advanced");

    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    await expect(page.getByText(/build a sober, highly configurable exam without leaving platform scope/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();

    await expect(page.getByRole("tab", { name: /basics/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /composition/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /delivery/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /access/i })).toBeVisible();

    await expect(page.getByText(/choose the academic lane and exam identity/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /auto fill basics/i })).toBeVisible();
    await expect(page.getByText(/start from a real exam product shape/i).first()).toBeVisible();
    await expect(page.getByText(/save the current builder setup as a reusable governed pack/i).first()).toBeVisible();
    await expect(page.getByText(/save current setup as a template/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save template/i })).toBeVisible();
    await expect(page.getByLabel(/academic year/i)).toBeVisible();
    await expect(page.getByText(/^program$/i).first()).toBeVisible();
    await expect(page.getByText(/^primary subject$/i).first()).toBeVisible();
    await expect(
      page
        .locator(".advancedBuilderField")
        .filter({ has: page.getByText(/^primary subject$/i) })
        .locator("select")
        .first(),
    ).toBeVisible();
    await expect(page.getByLabel(/exam title/i)).toBeVisible();

    await page.getByRole("button", { name: /auto fill basics/i }).click();
    await expect(page.getByLabel(/exam title/i)).not.toHaveValue("");

    await page.getByRole("tab", { name: /composition/i }).click();
    await expect(page.getByText(/sections, topics, and counts/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /quick practice/i }).first()).toBeVisible();
    await expect(page.getByLabel(/selection mode/i)).toBeVisible();
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(page.getByRole("button", { name: /^remove$/i }).first()).toBeVisible();
    await expect(page.getByLabel(/section name/i).nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /add topic/i }).first()).toBeVisible();

    await page.getByRole("tab", { name: /delivery/i }).click();
    await expect(page.getByText(/attempt, navigation, and review/i).first()).toBeVisible();
    await expect(page.getByText(/save current setup as a template/i).first()).toBeVisible();

    await page.getByRole("tab", { name: /access/i }).click();
    await expect(page.getByText(/economy and unlock behavior/i).first()).toBeVisible();
    await expect(page.getByText(/save as managed pack/i).first()).toBeVisible();
    await expect(page.getByText(/save template/i).first()).toBeVisible();

    await page.getByRole("link", { name: /preset library/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/preset-packs(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
  });
});
