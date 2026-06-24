import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin academic setup workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can switch academic setup sections and inspect defaults safely", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/academic-setup");

    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /academic years/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /programs/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /cohorts/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /subjects/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /topics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /assignments/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /exam defaults/i }).first()).toBeVisible();

    const instituteSelect = page.locator('select[aria-label="Select institute"]').first();
    await expect(instituteSelect).toBeVisible();
    await page.getByRole("button", { name: /^open$/i }).click();
    await expect(page).toHaveURL(/\/admin\/academic-setup\?/);

    await page.getByRole("link", { name: /programs/i }).first().click();
    await expect(page).toHaveURL(/section=programs/);
    await expect(page.getByText(/^programs$/i).first()).toBeVisible();
    const showArchivedPrograms = page.getByRole("checkbox", { name: /show archived/i });
    await expect(showArchivedPrograms).toBeVisible();
    await showArchivedPrograms.check();
    await expect(showArchivedPrograms).toBeChecked();
    await page.getByRole("button", { name: /add/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add programs/i })).toBeVisible();
    await expect(page.getByLabel(/program name/i)).toBeVisible();
    await expect(page.getByLabel(/assessment family/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /add/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /subjects/i }).first().click();
    await expect(page).toHaveURL(/section=subjects/);
    await expect(page.getByText(/^subjects$/i).first()).toBeVisible();
    await page.getByRole("button", { name: /add/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add subjects/i })).toBeVisible();
    await expect(page.getByLabel(/subject name/i)).toBeVisible();
    await expect(page.getByLabel(/subject code/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /add/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /topics/i }).first().click();
    await expect(page).toHaveURL(/section=topics/);
    await expect(page.getByText(/^topics$/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /add/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /add/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add topics/i })).toBeVisible();
    await expect(page.getByLabel(/difficulty/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel|close/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("link", { name: /exam defaults/i }).first().click();
    await expect(page).toHaveURL(/section=exam-defaults/);
    await expect(page.getByText(/duration minutes/i).first()).toBeVisible();
    await expect(page.getByText(/max attempts/i).first()).toBeVisible();
    await expect(page.getByText(/timer mode/i).first()).toBeVisible();
    await expect(page.getByText(/navigation mode/i).first()).toBeVisible();
    await expect(page.getByText(/attempt policy/i).first()).toBeVisible();
    await expect(page.getByText(/security mode/i).first()).toBeVisible();
    await expect(page.getByText(/instructions/i).first()).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /allow resume/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save defaults/i })).toBeVisible();
  });
});
