import { readFile } from "node:fs/promises";
import { expect, test, type Download } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);

type AdvancedTemplateListResponse = {
  results?: Array<{
    id: string;
    name: string;
  }>;
};

async function expectJsonDownload(download: Download, expectedFileName: string, expectedFragments: string[]) {
  expect(download.suggestedFilename()).toBe(expectedFileName);
  const filePath = await download.path();
  expect(filePath).not.toBeNull();

  const content = await readFile(filePath!, "utf8");
  expect(content.length).toBeGreaterThan(20);
  for (const fragment of expectedFragments) {
    expect(content).toContain(fragment);
  }
}

test.describe("Teacher advanced builder template actions", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
      "disposable teacher advanced builder template coverage",
    ),
  );

  test("@workflow @mutable teacher can save, export, import, and clean up advanced builder templates", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const templateName = `PW Advanced Template ${uniqueSeed}`;
    const importedTemplateName = `${templateName} Copy`;

    async function cleanupTemplates() {
      const listResponse = await page.request.get("/api/exams/advanced-templates");
      expect(listResponse.ok()).toBe(true);
      const payload = (await listResponse.json()) as AdvancedTemplateListResponse;
      const matchingTemplates =
        payload.results?.filter(
          (template) =>
            template.name === templateName ||
            template.name.startsWith(`${templateName} (`) ||
            template.name === importedTemplateName,
        ) ?? [];

      for (const template of matchingTemplates) {
        const deleteResponse = await page.request.delete(`/api/exams/advanced-templates/${template.id}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }

    try {
      await page.goto("/teacher/exams/advanced");
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

      const templateNameField = page.getByLabel(/save current setup as a template/i).first();
      await expect(templateNameField).toBeVisible();
      await templateNameField.fill(templateName);

      await page.getByRole("button", { name: /^save template$/i }).click();
      await expect(
        page.getByText(new RegExp(`saved "${templateName}" as a reusable teacher template`, "i")),
      ).toBeVisible();

      const searchField = page.getByPlaceholder(/search by name, owner, or note/i);
      await searchField.fill(templateName);

      const savedTemplateCard = page.locator(".advancedBuilderSavedTemplateCard").filter({
        has: page.getByText(new RegExp(templateName, "i")).first(),
      }).first();
      await expect(savedTemplateCard).toBeVisible();
      await savedTemplateCard.locator('input[type="checkbox"]').check();

      const exportDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /^export selected$/i }).click();
      const exportDownload = await exportDownloadPromise;
      await expectJsonDownload(exportDownload, "advanced-exam-templates-teacher-1.json", [
        `"name": "${templateName}"`,
        '"version": 1',
        '"templates"',
      ]);
      await expect(page.getByText(/exported 1 template\(s\) as a reusable json bundle\./i)).toBeVisible();

      const exportPath = await exportDownload.path();
      expect(exportPath).not.toBeNull();

      const importInput = page.locator('input[type="file"][accept="application/json"]').first();
      await importInput.setInputFiles(exportPath!);

      await expect(page.getByText(/imported 1 template\(s\) into your editable library\./i)).toBeVisible();
      await searchField.fill(templateName);
      await expect(page.locator(".advancedBuilderSavedTemplateCard")).toHaveCount(2);
      await expect(page.getByText(new RegExp(`${templateName} Copy`, "i")).first()).toBeVisible();
    } finally {
      await cleanupTemplates();
    }
  });
});
