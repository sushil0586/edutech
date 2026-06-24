import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
);

type PresetPackListResponse = {
  results?: Array<{
    id: string;
    resourceId?: string;
    label: string;
    can_manage?: boolean;
    scope_type?: string | null;
  }>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin preset pack library mutable actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
      "disposable admin preset pack library coverage",
    ),
  );

  test("@workflow @mutable admin can create edit and archive a disposable managed preset pack", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const packLabel = `PW Admin Managed Pack ${uniqueSeed}`;
    const packCode = `pw_admin_managed_${uniqueSeed}`;
    const updatedPackLabel = `${packLabel} Updated`;
    const packFamily = "Certification";
    const updatedPackFamily = "Professional Certification";
    const packChip = "Managed";
    const updatedPackChip = "Platform Managed";
    const packNote = "Disposable platform-admin preset pack created by Playwright.";
    const updatedPackNote = "Updated disposable platform-admin preset pack metadata from the preset library.";

    async function cleanupPresetPacks() {
      const response = await page.request.get("/api/exams/preset-packs");
      expect(response.ok()).toBe(true);
      const payload = (await response.json()) as PresetPackListResponse;
      const matchingPacks =
        payload.results?.filter(
          (pack) =>
            pack.resourceId &&
            (pack.id === packCode ||
              pack.label === packLabel ||
              pack.label === updatedPackLabel ||
              pack.label.startsWith(`${packLabel} (`)),
        ) ?? [];

      for (const pack of matchingPacks) {
        const deleteResponse = await page.request.delete(`/api/exams/preset-packs/${pack.resourceId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }

    try {
      await page.goto("/admin/exams/advanced");
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /preset label/i }).fill(packLabel);
      await page.getByRole("textbox", { name: /preset code/i }).fill(packCode);
      await page.getByRole("textbox", { name: /^family$/i }).fill(packFamily);
      await page.getByRole("textbox", { name: /^chip$/i }).fill(packChip);
      await page.getByRole("textbox", { name: /pack note/i }).fill(packNote);
      await page.getByRole("button", { name: /save as managed pack/i }).click();

      await expect(
        page.getByText(new RegExp(`saved "${escapeRegExp(packLabel)}" as a managed preset pack for platform scope`, "i")),
      ).toBeVisible();

      await page.goto("/admin/exams/preset-packs");
      await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();

      const searchInput = page.getByLabel(/search preset packs/i).first();
      await searchInput.fill(packCode);
      await page.locator(".advancedBuilderSavedTemplateFilter").getByRole("button", { name: /platform/i }).click();

      const packCard = page.locator(".presetLibraryCard").filter({
        has: page.getByText(new RegExp(escapeRegExp(packLabel), "i")).first(),
      }).first();
      await expect(packCard).toBeVisible();

      await packCard.getByRole("button", { name: /edit metadata/i }).click();
      await packCard.getByRole("textbox", { name: /^label$/i }).fill(updatedPackLabel);
      await packCard.getByRole("textbox", { name: /^family$/i }).fill(updatedPackFamily);
      await packCard.getByRole("textbox", { name: /^chip$/i }).fill(updatedPackChip);
      await packCard.getByRole("textbox", { name: /usage note/i }).fill(updatedPackNote);
      await packCard.getByRole("button", { name: /save metadata/i }).click();

      await expect(
        page.getByText(new RegExp(`updated "${escapeRegExp(updatedPackLabel)}" in the platform library`, "i")),
      ).toBeVisible();

      const updatedPackCard = page.locator(".presetLibraryCard").filter({
        has: page.getByText(new RegExp(escapeRegExp(updatedPackLabel), "i")).first(),
      }).first();
      await expect(updatedPackCard).toBeVisible();
      await expect(updatedPackCard).toContainText(updatedPackFamily);
      await expect(updatedPackCard).toContainText(updatedPackChip);
      await expect(updatedPackCard).toContainText(updatedPackNote);

      await updatedPackCard.getByRole("button", { name: /^archive$/i }).click();
      await expect(
        page.getByText(new RegExp(`archived "${escapeRegExp(updatedPackLabel)}" from the platform library`, "i")),
      ).toBeVisible();
      await expect(
        page.locator(".presetLibraryCard").filter({
          has: page.getByText(new RegExp(escapeRegExp(updatedPackLabel), "i")).first(),
        }),
      ).toHaveCount(0);
    } finally {
      await cleanupPresetPacks();
    }
  });
});
