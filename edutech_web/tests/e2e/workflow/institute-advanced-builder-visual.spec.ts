import { expect, test } from "@playwright/test";

import {
  applyBuilderTemplate,
  applyResolvedScope,
  openAdvancedBuilder,
  resolveClass7MathScope,
} from "../helpers/advanced-builder";
import { expectInstituteWorkspace } from "../helpers/navigation";

const obpmsInstituteCredentials = {
  username: "obpms",
  password: "Demo@12345",
};

test.describe("Institute advanced builder visual flow", () => {
  test("@workflow @visual institute advanced-builder shows inventory guidance and modal details", async ({
    page,
  }, testInfo) => {
    await openAdvancedBuilder(page, {
      credentials: obpmsInstituteCredentials,
      role: "institute",
      path: "/institute/exams/advanced",
      expectWorkspace: expectInstituteWorkspace,
    });
    const scope = await resolveClass7MathScope(page);
    await applyResolvedScope(page, scope);

    await applyBuilderTemplate(page, /premium mock/i, /premium mock template applied/i);
    await expect(page.getByText(/premium mock template applied/i)).toBeVisible();

    const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
    await firstSectionCard.getByLabel(/section subject/i).selectOption(scope.subjectId);

    await firstSectionCard.getByLabel(/^foundation$/i).fill("20");
    await firstSectionCard.getByLabel(/^intermediate$/i).fill("20");
    await firstSectionCard.getByLabel(/^advanced$/i).fill("60");

    await expect(firstSectionCard.locator(".advancedBuilderInventorySummary").first()).toContainText(/F 260 · I 390 · A 0/i);

    const cardShot = testInfo.outputPath("advanced-builder-section-inventory-state.png");
    await firstSectionCard.screenshot({ path: cardShot });
    await testInfo.attach("advanced-builder-section-inventory-state", {
      path: cardShot,
      contentType: "image/png",
    });

    await firstSectionCard.getByRole("button", { name: /view inventory/i }).click();
    const inventoryDialog = page.locator(".advancedBuilderInventoryDialog");
    await expect(inventoryDialog).toBeVisible();
    await expect(inventoryDialog).toContainText(/inventory details/i);
    await expect(inventoryDialog).toContainText(/math/i);
    await expect(inventoryDialog).toContainText(/F 260/i);
    await expect(inventoryDialog).toContainText(/I 390/i);
    await expect(inventoryDialog).toContainText(/A 0/i);

    const modalShot = testInfo.outputPath("advanced-builder-inventory-modal-state.png");
    await inventoryDialog.screenshot({ path: modalShot });
    await testInfo.attach("advanced-builder-inventory-modal-state", {
      path: modalShot,
      contentType: "image/png",
    });
  });
});
