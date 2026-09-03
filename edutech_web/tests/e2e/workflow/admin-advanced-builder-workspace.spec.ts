import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { fetchPrograms, fetchSubjects, fetchTopics } from "../helpers/assessment-family";
import { expectAdminWorkspace } from "../helpers/navigation";

async function resolveScopeWithTopics(page: import("@playwright/test").Page, instituteId: string) {
  const programs = await fetchPrograms(page, instituteId);
  for (const program of programs) {
    const subjects = await fetchSubjects(page, program.id, instituteId);
    for (const subject of subjects) {
      const topics = await fetchTopics(page, subject.id, instituteId);
      if (topics.length > 0) {
        return {
          programId: program.id,
          subjectId: subject.id,
        };
      }
    }
  }
  return null;
}

test.describe("Admin advanced exam builder workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect advanced builder controls and preset governance lanes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/advanced");

    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    await expect(page.getByText(/build a sober, highly configurable exam without leaving platform scope/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();

    await expect(page.getByRole("tab", { name: /basics/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /composition/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /delivery/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /access/i })).toBeVisible();

    await expect(page.getByText(/choose the academic lane and exam identity/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /auto fill basics/i })).toBeVisible();
    await expect(page.getByText(/start from a real exam product shape/i).first()).toBeVisible();
    await expect(page.getByText(/save the current builder setup as a reusable governed pack/i).first()).toBeVisible();
    await expect(page.getByText(/save current setup as a template/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save template/i })).toBeVisible();
    await expect(page.getByLabel(/academic year/i)).toBeVisible();
    await expect(page.getByText(/^program$/i).first()).toBeVisible();
    await expect(page.getByText(/^primary subject$/i).first()).toBeVisible();
    await expect(
      page
        .locator(".advancedBuilderField")
        .filter({ has: page.getByText(/^primary subject$/i) })
        .locator("select")
        .first(),
    ).toBeVisible();
    await expect(page.getByLabel(/exam title/i)).toBeVisible();

    await page.getByRole("button", { name: /auto fill basics/i }).click();
    await expect(page.getByLabel(/exam title/i)).not.toHaveValue("");

    await page.getByRole("tab", { name: /composition/i }).click();
    await expect(page.getByText(/sections, topics, and counts/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /quick practice/i }).first()).toBeVisible();
    await expect(page.getByLabel(/selection mode/i)).toBeVisible();
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(page.getByRole("button", { name: /^remove$/i }).first()).toBeVisible();
    await expect(page.getByLabel(/section name/i).nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /add topic/i }).first()).toBeVisible();

    await page.getByRole("tab", { name: /delivery/i }).click();
    await expect(page.getByText(/attempt, navigation, and review/i).first()).toBeVisible();
    await expect(page.getByText(/save current setup as a template/i).first()).toBeVisible();

    await page.getByRole("tab", { name: /access/i }).click();
    await expect(page.getByText(/economy and unlock behavior/i).first()).toBeVisible();
    await expect(page.getByText(/save as managed pack/i).first()).toBeVisible();
    await expect(page.getByText(/save template/i).first()).toBeVisible();

    await page.getByRole("link", { name: /preset library/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/preset-packs(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
  });

  test("@workflow admin advanced builder blocks create after preview resolution fails", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/advanced");

    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    const instituteSelect = page.getByLabel(/select template institute/i);
    await instituteSelect.selectOption("Demo Learning Institute (DLI001)");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();
    const instituteId = await instituteSelect.inputValue();
    expect(instituteId).not.toBe("");

    const academicYearSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Academic year$/i) })
      .locator("select");
    const programSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Program$/i) })
      .locator("select");
    const subjectSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Primary subject$/i) })
      .locator("select");

    const hasCanonicalFamilyAcademicYear = await academicYearSelect.evaluate((element) => {
      const select = element as HTMLSelectElement;
      return Array.from(select.options).some((option) => option.label.trim() === "2026-2027");
    });
    if (hasCanonicalFamilyAcademicYear) {
      await academicYearSelect.selectOption({ label: "2026-2027" });
      await expect(academicYearSelect).toHaveValue(/\S+/);
    }
    const resolvedScope = await resolveScopeWithTopics(page, instituteId);
    expect(resolvedScope).not.toBeNull();
    await programSelect.selectOption(resolvedScope!.programId);
    await expect(programSelect).toHaveValue(/\S+/);
    await expect
      .poll(async () => subjectSelect.locator("option").count(), {
        timeout: 30000,
        message: "Expected the advanced builder subject selector to load real subject options.",
      })
      .toBeGreaterThan(1);
    await subjectSelect.selectOption(resolvedScope!.subjectId);
    await expect(subjectSelect).toHaveValue(/\S+/);

    await expect(async () => {
      await page.getByRole("button", { name: /quick practice/i }).click();
      await expect(page.getByText(/quick practice template applied/i)).toBeVisible();
    }).toPass({ timeout: 30000 });

    await page.getByRole("tab", { name: /composition/i }).click();
    await page.getByLabel(/selection mode/i).selectOption("subject_fallback");

    const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
    await firstSectionCard.getByLabel(/question count/i).fill("1");

    const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
    for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
      await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
    }

    const firstTopicRow = firstSectionCard.locator(".advancedBuilderTopicRow").first();
    await firstTopicRow.locator('input[type="number"]').fill("1");

    await page.route("**/api/exams/advanced-builder/preview", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          composition: ["Practice Set requested 1 question(s) but only 0 could be resolved."],
        }),
      });
    });

    await page.getByRole("button", { name: /preview exam/i }).click();
    await expect(page.getByText(/requested 1 question\(s\) but only 0 could be resolved\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create advanced exam/i })).toBeDisabled();
  });

  test("@workflow admin browser coverage exercises advanced-builder button actions", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/advanced");
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    const instituteSelect = page.getByLabel(/select template institute/i);
    await instituteSelect.selectOption("Demo Learning Institute (DLI001)");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();

    const instituteId = await instituteSelect.inputValue();
    expect(instituteId).not.toBe("");

    const academicYearSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Academic year$/i) })
      .locator("select");
    const programSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Program$/i) })
      .locator("select");
    const subjectSelect = page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(/^Primary subject$/i) })
      .locator("select");

    const hasCanonicalFamilyAcademicYear = await academicYearSelect.evaluate((element) => {
      const select = element as HTMLSelectElement;
      return Array.from(select.options).some((option) => option.label.trim() === "2026-2027");
    });
    if (hasCanonicalFamilyAcademicYear) {
      await academicYearSelect.selectOption({ label: "2026-2027" });
      await expect(academicYearSelect).toHaveValue(/\S+/);
    }

    const resolvedScope = await resolveScopeWithTopics(page, instituteId);
    expect(resolvedScope).not.toBeNull();
    await programSelect.selectOption(resolvedScope!.programId);
    await expect
      .poll(async () => subjectSelect.locator("option").count(), {
        timeout: 30000,
        message: "Expected the admin advanced builder subject selector to load real subject options.",
      })
      .toBeGreaterThan(1);
    await subjectSelect.selectOption(resolvedScope!.subjectId);
    await expect(subjectSelect).toHaveValue(/\S+/);

    await page.getByRole("button", { name: /auto fill basics/i }).click();
    await expect(page.getByLabel(/exam title/i)).not.toHaveValue("");

    await page.getByRole("button", { name: /quick practice/i }).click();
    await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/choose the academic lane and exam identity/i).first()).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/sections, topics, and counts/i).first()).toBeVisible();

    await page.getByRole("button", { name: /chapter test/i }).click();
    await expect(page.getByText(/chapter test template applied/i)).toBeVisible();
    await page.getByRole("button", { name: /premium mock/i }).click();
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

    let savedManagedPackRequest: Record<string, unknown> | null = null;
    let savedTemplateRequest: Record<string, unknown> | null = null;
    await page.route("**/api/exams/preset-packs*", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        savedManagedPackRequest = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "admin-managed-pack-browser-coverage" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              id: "admin-managed-pack-browser-coverage",
              label: "Admin Managed Pack Browser Coverage",
              family: "Custom",
              note: "Admin managed pack browser coverage fixture",
              chip: "Managed",
              scope_type: "platform",
              can_manage: true,
              resourceId: "admin-managed-pack-browser-coverage-resource",
            },
          ],
        }),
      });
    });
    await page.route("**/api/exams/advanced-templates*", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        savedTemplateRequest = JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "admin-template-browser-coverage",
            name:
              typeof savedTemplateRequest?.name === "string"
                ? savedTemplateRequest.name
                : "Admin Template Browser Coverage",
            description: "Admin template browser coverage fixture",
            audience_context:
              typeof savedTemplateRequest?.audience_context === "string"
                ? savedTemplateRequest.audience_context
                : "institute",
            blueprint:
              savedTemplateRequest?.blueprint && typeof savedTemplateRequest.blueprint === "object"
                ? savedTemplateRequest.blueprint
                : { sections: [] },
            can_manage: true,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.getByRole("button", { name: /save as managed pack/i }).click();
    await expect(page.getByText(/saved ".*" as a managed preset pack/i)).toBeVisible();
    const savedManagedPackSnapshot = savedManagedPackRequest as Record<string, unknown> | null;
    expect(savedManagedPackSnapshot).toBeTruthy();
    expect(savedManagedPackSnapshot?.config).toBeTruthy();

    await page.getByRole("button", { name: /save template/i }).click();
    await expect(page.getByText(/saved ".*" as a reusable .* template/i)).toBeVisible();
    const savedTemplateSnapshot = savedTemplateRequest as Record<string, unknown> | null;
    expect(savedTemplateSnapshot).toBeTruthy();
    expect(savedTemplateSnapshot?.blueprint).toBeTruthy();
  });
});
