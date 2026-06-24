import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin preset pack library", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect preset pack library filters and builder handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/preset-packs");

    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open advanced builder/i }).first()).toBeVisible();
    await expect(page.getByText(/search the library and move into builder when you are ready to tune runtime/i).first()).toBeVisible();

    const searchInput = page.getByLabel(/search preset packs/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("aws");
    await expect(searchInput).toHaveValue("aws");

    await page.getByRole("button", { name: /starter/i }).click();
    await expect(page.getByText(/scope:\s*starter/i).first()).toBeVisible();

    await page.getByRole("button", { name: /managed/i }).click();
    await expect(page.getByText(/scope:\s*managed/i).first()).toBeVisible();

    await page.getByRole("button", { name: /all packs/i }).click();
    await expect(page.getByText(/scope:\s*all/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open in builder/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /back to exams/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.goto("/admin/exams/preset-packs");
    const openInBuilderLink = page.getByRole("link", { name: /open in builder/i }).first();
    const openInBuilderHref = await openInBuilderLink.getAttribute("href");
    expect(openInBuilderHref).toMatch(/\/admin\/exams\/advanced\?preset_pack=/);
    await openInBuilderLink.click();
    await expect(page).toHaveURL(/\/admin\/exams\/advanced\?preset_pack=/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    await page.goto("/admin/exams/preset-packs");
    await page.getByRole("link", { name: /open advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
  });
});
