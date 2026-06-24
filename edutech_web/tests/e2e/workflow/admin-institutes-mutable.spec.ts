import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminInstituteActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
);

type CreateInstitutePayload = {
  id?: string;
  detail?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin mutable institute actions", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminInstituteActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
      "disposable admin institute create and edit coverage",
    ),
  );

  test("@workflow @mutable admin can create, edit, and delete a disposable institute", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteName = `PW Admin Institute ${uniqueSeed}`;
    const instituteUpdatedName = `${instituteName} Updated`;
    const instituteCode = `PWAI${String(uniqueSeed).slice(-6)}`;
    const instituteUpdatedCode = `${instituteCode}U`;
    const instituteEmail = `pw.admin.institute.${uniqueSeed}@example.test`;
    const instituteUpdatedEmail = `pw.admin.institute.updated.${uniqueSeed}@example.test`;
    const institutePhone = `90001${String(uniqueSeed).slice(-5)}`;
    const instituteWebsite = `https://pw-admin-${uniqueSeed}.example.test`;
    const instituteDescription = "Disposable admin institute created by Playwright.";
    const instituteUpdatedDescription = "Disposable admin institute updated by Playwright.";

    let instituteId: string | null = null;

    try {
      await page.goto("/admin/institutes");
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

      await page.getByRole("button", { name: /add institute/i }).click();
      const createDialog = page.getByRole("dialog");
      await expect(createDialog.getByRole("heading", { name: /add institute/i })).toBeVisible();

      await createDialog.getByLabel(/institute name/i).fill(instituteName);
      await createDialog.getByLabel(/^code$/i).fill(instituteCode);
      await createDialog.getByLabel(/^email$/i).fill(instituteEmail);
      await createDialog.getByLabel(/^phone$/i).fill(institutePhone);
      await createDialog.getByLabel(/website/i).fill(instituteWebsite);
      await createDialog.getByLabel(/description/i).fill(instituteDescription);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/institutes") &&
          response.request().method() === "POST",
      );
      await createDialog.getByRole("button", { name: /save institute/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBe(true);
      const createPayload = (await createResponse.json()) as CreateInstitutePayload;
      instituteId = createPayload.id ?? null;
      expect(instituteId).not.toBeNull();

      await expect(page).toHaveURL(new RegExp(`/admin/institutes\\?institute=${instituteId}`));
      const detailCard = page.locator(".adminInstituteDetailCard").first();
      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteName), "i") }),
      ).toBeVisible();
      await expect(detailCard.getByText(new RegExp(escapeRegExp(instituteCode), "i")).first()).toBeVisible();

      await page.getByRole("button", { name: /edit selected/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByRole("heading", { name: /edit /i })).toBeVisible();

      await editDialog.getByLabel(/institute name/i).fill(instituteUpdatedName);
      await editDialog.getByLabel(/^code$/i).fill(instituteUpdatedCode);
      await editDialog.getByLabel(/^email$/i).fill(instituteUpdatedEmail);
      await editDialog.getByLabel(/description/i).fill(instituteUpdatedDescription);

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /save institute/i }).click();
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.ok()).toBe(true);

      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteUpdatedName), "i") }),
      ).toBeVisible();
      await expect(detailCard.getByText(new RegExp(escapeRegExp(instituteUpdatedCode), "i")).first()).toBeVisible();
      await expect(detailCard.getByText(new RegExp(escapeRegExp(instituteUpdatedEmail), "i")).first()).toBeVisible();
      await expect(
        detailCard.getByText(new RegExp(escapeRegExp(instituteUpdatedDescription), "i")).first(),
      ).toBeVisible();

      const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
      await expect(accountPanel).toContainText(/credential controls/i);

      const createLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
          response.request().method() === "POST",
      );
      await accountPanel.getByRole("button", { name: /create login/i }).click();
      const createLoginResponse = await createLoginResponsePromise;
      expect(createLoginResponse.ok()).toBe(true);
      await expect(accountPanel.getByText(/created login for/i)).toBeVisible();
      await expect(accountPanel.getByRole("button", { name: /reset password/i })).toBeVisible();
      await expect(accountPanel.getByRole("button", { name: /disable login/i })).toBeVisible();

      const resetPasswordResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/reset-password") &&
          response.request().method() === "POST",
      );
      await accountPanel.getByRole("button", { name: /reset password/i }).click();
      const resetDialog = page.getByRole("dialog");
      await expect(resetDialog.getByRole("heading", { name: /update login password/i })).toBeVisible();
      await resetDialog.getByRole("checkbox", { name: /auto-generate password/i }).check();
      await resetDialog.getByRole("button", { name: /^reset password$/i }).click();
      const resetPasswordResponse = await resetPasswordResponsePromise;
      expect(resetPasswordResponse.ok()).toBe(true);
      await expect(accountPanel.getByText(/password reset for/i)).toBeVisible();

      const disableLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/disable") &&
          response.request().method() === "POST",
      );
      await accountPanel.getByRole("button", { name: /disable login/i }).click();
      const disableLoginResponse = await disableLoginResponsePromise;
      expect(disableLoginResponse.ok()).toBe(true);
      await expect(accountPanel.getByText(/login disabled successfully\./i)).toBeVisible();
      await expect(accountPanel.getByRole("button", { name: /enable login/i })).toBeVisible();

      const enableLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/enable") &&
          response.request().method() === "POST",
      );
      await accountPanel.getByRole("button", { name: /enable login/i }).click();
      const enableLoginResponse = await enableLoginResponsePromise;
      expect(enableLoginResponse.ok()).toBe(true);
      await expect(accountPanel.getByText(/login enabled successfully\./i)).toBeVisible();
      await expect(accountPanel.getByRole("button", { name: /disable login/i })).toBeVisible();
    } finally {
      if (instituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${instituteId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
