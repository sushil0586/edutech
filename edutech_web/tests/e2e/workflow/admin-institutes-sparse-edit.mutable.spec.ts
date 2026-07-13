import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminInstituteActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
);

type CreateInstitutePayload = {
  id?: string;
};

test.describe("Admin institutes sparse edit safety", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminInstituteActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
      "admin institute sparse edit regression coverage",
    ),
  );

  test("@workflow @mutable admin can open and save an institute with sparse optional fields", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteName = `PW Sparse Institute ${uniqueSeed}`;
    const instituteCode = `PWSI${String(uniqueSeed).slice(-6)}`;
    const updatedName = `${instituteName} Updated`;
    let instituteId: string | null = null;

    try {
      const createResponse = await page.request.post("/api/admin/institutes", {
        data: {
          name: instituteName,
          code: instituteCode,
          email: `pw.sparse.${uniqueSeed}@example.test`,
          phone: `90002${String(uniqueSeed).slice(-5)}`,
        },
      });
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as CreateInstitutePayload;
      instituteId = createPayload.id ?? null;
      expect(instituteId).toBeTruthy();

      const sparseDetailPath = `/api/v1/institutes/${instituteId}/`;
      await page.route(`**${sparseDetailPath}`, async (route) => {
        const response = await route.fetch();
        const payload = (await response.json()) as Record<string, unknown>;
        delete payload.address;
        delete payload.city;
        delete payload.state;
        delete payload.country;
        delete payload.pincode;
        delete payload.website;
        delete payload.description;
        await route.fulfill({
          response,
          json: payload,
        });
      });

      await page.goto(`/admin/institutes?institute=${instituteId}`);
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

      await page.getByRole("button", { name: /edit selected/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByRole("heading", { name: /edit /i })).toBeVisible();

      await expect(editDialog.getByLabel(/website/i)).toHaveValue("");
      await expect(editDialog.getByLabel(/description/i)).toHaveValue("");

      await editDialog.getByLabel(/institute name/i).fill(updatedName);

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /save institute/i }).click();
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.ok(), await patchResponse.text()).toBe(true);

      const detailCard = page.locator(".adminInstituteDetailCard").first();
      await expect(
        detailCard.getByRole("heading", { name: new RegExp(updatedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }),
      ).toBeVisible();
      await page.unroute(`**${sparseDetailPath}`);
    } finally {
      if (instituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${instituteId}`);
        expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);
      }
    }
  });
});
