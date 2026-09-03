import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function expectInstituteAccountPanelState(
  accountPanel: Locator,
  expectedState: "no_login" | "active_login" | "disabled_login",
) {
  const createLoginButton = accountPanel.getByRole("button", { name: /create login/i });
  const resetPasswordButton = accountPanel.getByRole("button", { name: /reset password/i });
  const disableLoginButton = accountPanel.getByRole("button", { name: /disable login/i });
  const enableLoginButton = accountPanel.getByRole("button", { name: /enable login/i });

  if (expectedState === "no_login") {
    await expect(createLoginButton).toBeVisible();
    await expect(resetPasswordButton).toHaveCount(0);
    await expect(disableLoginButton).toHaveCount(0);
    await expect(enableLoginButton).toHaveCount(0);
    await expect(accountPanel).toContainText(/no linked login/i);
    return;
  }

  await expect(createLoginButton).toHaveCount(0);
  await expect(resetPasswordButton).toBeVisible();

  if (expectedState === "active_login") {
    await expect(disableLoginButton).toBeVisible();
    await expect(enableLoginButton).toHaveCount(0);
    return;
  }

  await expect(disableLoginButton).toHaveCount(0);
  await expect(enableLoginButton).toBeVisible();
}

async function selectInstituteFromTable(page: Page, instituteName: string, instituteCode: string) {
  const instituteRow = page
    .locator("tbody tr")
    .filter({
      has: page.getByText(new RegExp(escapeRegExp(instituteName), "i")),
    })
    .filter({
      has: page.getByText(new RegExp(escapeRegExp(instituteCode), "i")),
    })
    .first();
  await expect(instituteRow).toBeVisible();
  await instituteRow.getByRole("button", { name: /^view$/i }).click();

  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(
    detailCard.locator("h4").filter({ hasText: new RegExp(escapeRegExp(instituteName), "i") }),
  ).toBeVisible();
  await expect(detailCard.getByText(new RegExp(escapeRegExp(instituteCode), "i")).first()).toBeVisible();
  return detailCard;
}

async function expectInstituteRow(page: Page, instituteName: string, instituteCode: string) {
  const instituteRow = page
    .locator("tbody tr")
    .filter({
      has: page.getByText(new RegExp(escapeRegExp(instituteName), "i")),
    })
    .filter({
      has: page.getByText(new RegExp(escapeRegExp(instituteCode), "i")),
    })
    .first();
  await expect(instituteRow).toBeVisible();
  return instituteRow;
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
    const instituteManagementMode = "public_institute_managed";
    const instituteUpdatedManagementMode = "platform_managed";

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
      await createDialog.getByLabel(/management mode/i).selectOption(instituteManagementMode);
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

      await expect(page).toHaveURL(new RegExp(`institute=${instituteId}`));
      if (!page.url().includes("/admin/institutes")) {
        await page.goto(`/admin/institutes?institute=${instituteId}`);
      }
      const detailCard = await selectInstituteFromTable(page, instituteName, instituteCode);
      await expect(detailCard.getByText(/public institute managed/i).first()).toBeVisible();

      await page.getByRole("button", { name: /edit selected/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByRole("heading", { name: /edit /i })).toBeVisible();

      await editDialog.getByLabel(/institute name/i).fill(instituteUpdatedName);
      await editDialog.getByLabel(/^code$/i).fill(instituteUpdatedCode);
      await editDialog.getByLabel(/^email$/i).fill(instituteUpdatedEmail);
      await editDialog.getByLabel(/management mode/i).selectOption(instituteUpdatedManagementMode);
      await editDialog.getByLabel(/description/i).fill(instituteUpdatedDescription);

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /save institute/i }).click();
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.ok()).toBe(true);

      const updatedRow = await expectInstituteRow(page, instituteUpdatedName, instituteUpdatedCode);
      await expect(updatedRow).toContainText(new RegExp(escapeRegExp(instituteUpdatedEmail), "i"));
      await expect(updatedRow).toContainText(/active/i);

      await page.goto(`/admin/institutes?institute=${instituteId}`);
      const refreshedDetailCard = await selectInstituteFromTable(page, instituteUpdatedName, instituteUpdatedCode);
      await expect(refreshedDetailCard.getByText(new RegExp(escapeRegExp(instituteUpdatedEmail), "i")).first()).toBeVisible();
      await expect(
        refreshedDetailCard.getByText(new RegExp(escapeRegExp(instituteUpdatedDescription), "i")).first(),
      ).toBeVisible();
      await expect(refreshedDetailCard.getByText(/platform managed/i).first()).toBeVisible();

      const accountPanel = refreshedDetailCard.locator(".adminInstituteAccountPanel").first();
      await expect(accountPanel).toContainText(/credential controls/i);
      await expectInstituteAccountPanelState(accountPanel, "no_login");

      const createLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
          response.request().method() === "POST",
      );
      await accountPanel.getByRole("button", { name: /create login/i }).click();
      const createLoginResponse = await createLoginResponsePromise;
      expect(createLoginResponse.ok()).toBe(true);
      await expect(accountPanel.getByText(/created login for/i)).toBeVisible();
      await expectInstituteAccountPanelState(accountPanel, "active_login");

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
      await expectInstituteAccountPanelState(accountPanel, "disabled_login");

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
      await expectInstituteAccountPanelState(accountPanel, "active_login");
    } finally {
      if (instituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${instituteId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
