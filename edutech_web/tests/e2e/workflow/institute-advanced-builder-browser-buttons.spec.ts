import { expect, test } from "@playwright/test";
import {
  applyBuilderTemplate,
  applyResolvedScope,
  openAdvancedBuilder,
  resolveScopeWithTopics,
  trimCompositionToSingleTopic,
} from "../helpers/advanced-builder";
import { expectInstituteWorkspace } from "../helpers/navigation";

const obpmsInstituteCredentials = {
  username: "obpms",
  password: "Demo@12345",
};

test.describe("Institute advanced builder browser button coverage", () => {
  test("@workflow browser coverage exercises institute advanced-builder buttons end-to-end", async ({
    page,
  }) => {
    await openAdvancedBuilder(page, {
      credentials: obpmsInstituteCredentials,
      role: "institute",
      path: "/institute/exams/advanced",
      expectWorkspace: expectInstituteWorkspace,
    });
    await applyResolvedScope(page, await resolveScopeWithTopics(page));

    const titleInput = page.getByLabel(/exam title/i);
    await page.getByRole("button", { name: /auto fill basics/i }).click();
    await expect(titleInput).not.toHaveValue("");

    await applyBuilderTemplate(page, /quick practice/i, /quick practice template applied/i);
    await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/choose the academic lane and exam identity/i).first()).toBeVisible();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/sections, topics, and counts/i).first()).toBeVisible();

    await applyBuilderTemplate(page, /chapter test/i, /chapter test template applied/i);
    await expect(page.getByText(/chapter test template applied/i)).toBeVisible();

    await applyBuilderTemplate(page, /premium mock/i, /premium mock template applied/i);
    await expect(page.getByText(/premium mock template applied/i)).toBeVisible();

    const sectionCards = page.locator(".advancedBuilderSectionCard");
    const baselineSectionCount = await sectionCards.count();
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(sectionCards).toHaveCount(baselineSectionCount + 1);
    await sectionCards
      .last()
      .getByRole("button", { name: /^remove$/i })
      .click();
    await expect(sectionCards).toHaveCount(baselineSectionCount);

    const firstSectionCard = sectionCards.first();
    const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
    const baselineTopicCount = await topicRows.count();
    await page.getByRole("button", { name: /^add topic$/i }).first().click();
    await expect(topicRows).toHaveCount(baselineTopicCount + 1);
    await topicRows
      .last()
      .getByRole("button", { name: /^remove$/i })
      .click();
    await expect(topicRows).toHaveCount(baselineTopicCount);

    await page.getByRole("button", { name: /fill from current builder/i }).click();
    await expect(page.getByLabel(/preset label/i)).not.toHaveValue("");
    await expect(page.getByLabel(/preset code/i)).not.toHaveValue("");
    await expect(page.getByLabel(/^family$/i)).not.toHaveValue("");

    let savedManagedPackRequest: Record<string, unknown> | null = null;
    await page.route("**/api/exams/preset-packs*", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        savedManagedPackRequest = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "pw-managed-pack-browser-coverage",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              id: "pw-managed-pack-browser-coverage",
              label: "PW Managed Pack Browser Coverage",
              family: "Custom",
              note: "Managed pack browser coverage fixture",
              chip: "Managed",
              scope_type: "institute",
              can_manage: true,
              resourceId: "pw-managed-pack-browser-coverage-resource",
            },
          ],
        }),
      });
    });

    await page.getByRole("button", { name: /save as managed pack/i }).click();
    await expect(page.getByText(/saved ".*" as a managed preset pack/i)).toBeVisible();
    const savedManagedPackSnapshot = savedManagedPackRequest as Record<string, unknown> | null;
    expect(savedManagedPackSnapshot).toBeTruthy();
    expect(String(savedManagedPackSnapshot?.code ?? "")).not.toBe("");
    expect(String(savedManagedPackSnapshot?.label ?? "")).not.toBe("");
    expect(savedManagedPackSnapshot?.config).toBeTruthy();
  });

  test("@workflow browser coverage keeps create blocked when preview returns composition errors", async ({
    page,
  }) => {
    await openAdvancedBuilder(page, {
      credentials: obpmsInstituteCredentials,
      role: "institute",
      path: "/institute/exams/advanced",
      expectWorkspace: expectInstituteWorkspace,
    });
    await applyResolvedScope(page, await resolveScopeWithTopics(page));

    await applyBuilderTemplate(page, /chapter test/i, /chapter test template applied/i);
    await expect(page.getByText(/chapter test template applied/i)).toBeVisible();
    await trimCompositionToSingleTopic(page);

    let previewRequestBody: Record<string, unknown> | null = null;
    let createRequestCount = 0;

    await page.route("**/api/exams/advanced-builder/preview", async (route) => {
      previewRequestBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          composition: [
            "Core Concepts: Arithmetic Expressions is short by 1 advanced questions.",
            "Core Concepts: Equivalent Fractions is short by 1 advanced questions.",
          ],
        }),
      });
    });
    await page.route("**/api/exams/advanced-builder/create", async (route) => {
      createRequestCount += 1;
      await route.abort();
    });

    const previewButton = page.getByRole("button", { name: /preview exam/i });
    const createButton = page.getByRole("button", { name: /create advanced exam/i });

    await previewButton.click();
    await expect(
      page.getByText(/core concepts: arithmetic expressions is short by 1 advanced questions\./i),
    ).toBeVisible();
    const previewRequestSnapshot = previewRequestBody as Record<string, unknown> | null;
    expect(previewRequestSnapshot).toBeTruthy();
    expect(previewRequestSnapshot?.composition).toBeTruthy();
    await expect(previewButton).toBeEnabled();
    await expect(createButton).toBeDisabled();

    await createButton.click({ force: true }).catch(() => null);
    expect(createRequestCount).toBe(0);
  });
});
