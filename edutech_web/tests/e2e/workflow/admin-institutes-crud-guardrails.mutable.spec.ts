import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminInstituteActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
);

type CreateInstitutePayload = {
  id?: string;
  onboarding_run_id?: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin institutes CRUD guardrails", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminInstituteActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
      "admin institute CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can create an institute with minimum valid form values", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteName = `PW Min Institute ${uniqueSeed}`;
    const instituteCode = `PWMI${String(uniqueSeed).slice(-6)}`;
    let instituteId: string | null = null;

    try {
      await page.goto("/admin/institutes");
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

      await page.getByRole("button", { name: /add institute/i }).click();
      const createDialog = page.getByRole("dialog");
      await expect(createDialog.getByRole("heading", { name: /add institute/i })).toBeVisible();

      await createDialog.getByLabel(/institute name/i).fill(instituteName);
      await createDialog.getByLabel(/^code$/i).fill(instituteCode);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/institutes") &&
          response.request().method() === "POST",
      );
      await createDialog.getByRole("button", { name: /save institute/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(true);

      const createPayload = (await createResponse.json()) as CreateInstitutePayload;
      instituteId = createPayload.id ?? null;
      expect(instituteId).toBeTruthy();

      await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?institute=${instituteId}`));
    } finally {
      if (instituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${instituteId}`);
        expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow @mutable admin edit cancel and active toggle stay truthful for institutes", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteName = `PW Guardrail Institute ${uniqueSeed}`;
    const instituteCode = `PWGI${String(uniqueSeed).slice(-6)}`;
    const editedButCancelledName = `${instituteName} Cancelled`;
    const instituteDescription = "Disposable CRUD guardrail institute.";
    let instituteId: string | null = null;

    try {
      const createResponse = await page.request.post("/api/admin/institutes", {
        data: {
          name: instituteName,
          code: instituteCode,
          email: `pw.guardrail.${uniqueSeed}@example.test`,
          phone: `90003${String(uniqueSeed).slice(-5)}`,
          website: `https://pw-guardrail-${uniqueSeed}.example.test`,
          description: instituteDescription,
          country: "India",
          state: "Delhi",
          city: "Delhi",
          pincode: "110001",
        },
      });
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as CreateInstitutePayload;
      instituteId = createPayload.id ?? null;
      expect(instituteId).toBeTruthy();

      await page.goto(`/admin/institutes?institute=${instituteId}`);
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

      const detailCard = page.locator(".adminInstituteDetailCard").first();
      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteName), "i") }),
      ).toBeVisible();
      await expect(detailCard.getByText(/^Active$/i).first()).toBeVisible();

      await page.getByRole("button", { name: /edit selected/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByRole("heading", { name: /edit /i })).toBeVisible();
      await editDialog.getByLabel(/institute name/i).fill(editedButCancelledName);
      await editDialog.getByLabel(/website/i).fill("");
      await editDialog.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteName), "i") }),
      ).toBeVisible();
      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(editedButCancelledName), "i") }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: /edit selected/i }).click();
      const reopenedDialog = page.getByRole("dialog");
      await expect(reopenedDialog.getByRole("heading", { name: /edit /i })).toBeVisible();
      await expect(reopenedDialog.getByLabel(/institute name/i)).toHaveValue(instituteName);
      await expect(reopenedDialog.getByLabel(/website/i)).toHaveValue(`https://pw-guardrail-${uniqueSeed}.example.test`);

      await reopenedDialog.getByRole("checkbox", { name: /institute is active/i }).uncheck();
      const deactivateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await reopenedDialog.getByRole("button", { name: /save institute/i }).click();
      const deactivateResponse = await deactivateResponsePromise;
      expect(deactivateResponse.ok(), await deactivateResponse.text()).toBe(true);
      await expect(detailCard.getByText(/^Inactive$/i).first()).toBeVisible();

      await page.getByRole("button", { name: /edit selected/i }).click();
      const reactivateDialog = page.getByRole("dialog");
      await expect(reactivateDialog.getByRole("checkbox", { name: /institute is active/i })).not.toBeChecked();
      await expect(reactivateDialog.getByLabel(/website/i)).toHaveValue(
        `https://pw-guardrail-${uniqueSeed}.example.test`,
      );
      await expect(reactivateDialog.getByLabel(/description/i)).toHaveValue(instituteDescription);
      await reactivateDialog.getByLabel(/website/i).fill("");
      await reactivateDialog.getByLabel(/description/i).fill("");
      await reactivateDialog.getByRole("checkbox", { name: /institute is active/i }).check();

      const reactivateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await reactivateDialog.getByRole("button", { name: /save institute/i }).click();
      const reactivateResponse = await reactivateResponsePromise;
      expect(reactivateResponse.ok(), await reactivateResponse.text()).toBe(true);
      await expect(detailCard.getByText(/^Active$/i).first()).toBeVisible();

      await page.reload();
      await expect(detailCard.getByText(/^Active$/i).first()).toBeVisible();
      await page.getByRole("button", { name: /edit selected/i }).click();
      const clearedFieldDialog = page.getByRole("dialog");
      await expect(clearedFieldDialog.getByLabel(/website/i)).toHaveValue("");
      await expect(clearedFieldDialog.getByLabel(/description/i)).toHaveValue("");
    } finally {
      if (instituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${instituteId}`);
        expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);
      }
    }
  });
});
