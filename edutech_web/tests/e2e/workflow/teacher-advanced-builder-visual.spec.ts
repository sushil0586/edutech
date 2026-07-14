import { expect, test } from "@playwright/test";

import {
  applyBuilderTemplate,
  applyResolvedScope,
  openAdvancedBuilder,
  resolveClass7MathScope,
} from "../helpers/advanced-builder";
import { expectTeacherWorkspace } from "../helpers/navigation";

const teacherCredentials = {
  username: "demo-teacher",
  password: "Demo@12345",
};

test.describe("Teacher advanced builder visual flow", () => {
  test("@workflow @visual teacher advanced-builder shows inventory guidance and modal details", async ({
    page,
  }, testInfo) => {
    await openAdvancedBuilder(page, {
      credentials: teacherCredentials,
      role: "teacher",
      path: "/teacher/exams/advanced",
      expectWorkspace: expectTeacherWorkspace,
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

    await expect(firstSectionCard.locator(".advancedBuilderInventorySummary").first()).toContainText(/A 0/i);
    await expect(firstSectionCard).toContainText(/active question\(s\) in this subject\./i);

    const cardShot = testInfo.outputPath("teacher-advanced-builder-section-inventory-state.png");
    await firstSectionCard.screenshot({ path: cardShot });
    await testInfo.attach("teacher-advanced-builder-section-inventory-state", {
      path: cardShot,
      contentType: "image/png",
    });

    await firstSectionCard.getByRole("button", { name: /view inventory/i }).click();
    const inventoryDialog = page.locator(".advancedBuilderInventoryDialog");
    await expect(inventoryDialog).toBeVisible();
    await expect(inventoryDialog).toContainText(/inventory details/i);
    await expect(inventoryDialog).toContainText(/math/i);
    await expect(inventoryDialog).toContainText(/A 0/i);

    const modalShot = testInfo.outputPath("teacher-advanced-builder-inventory-modal-state.png");
    await inventoryDialog.screenshot({ path: modalShot });
    await testInfo.attach("teacher-advanced-builder-inventory-modal-state", {
      path: modalShot,
      contentType: "image/png",
    });
  });
});
