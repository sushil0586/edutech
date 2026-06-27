import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAssessmentRegistryContracts,
  expectPreviewFamilyContract,
  fetchAssessmentRegistry,
  fetchPrograms,
  type AssessmentRegistryResponse,
  type ProgramRegistryRecord,
} from "../helpers/assessment-family";
import { expectAdminWorkspace } from "../helpers/navigation";

function findProgramByFamily(programs: ProgramRegistryRecord[], familyCode: string) {
  return programs.find((program) => program.assessment_family_profile?.code === familyCode) ?? null;
}

function questionTypeLabel(
  registry: AssessmentRegistryResponse,
  code: string,
) {
  return registry.question_types.find((item) => item.code === code)?.label ?? code;
}

async function applyAdminTemplateScope(page: Page) {
  await page.getByLabel(/select template institute/i).selectOption("Demo Learning Institute (DLI001)");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();
}

async function alignAdminFamilyScope(
  page: Page,
  options: {
    packLabel: string;
    programLabel: string;
    subjectLabel: string;
    familyCode: string;
  },
) {
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select")
    .selectOption({ label: options.programLabel });
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Subject$/i) })
    .locator("select")
    .selectOption({ label: options.subjectLabel });
  await expect(page.getByText(new RegExp(`Assessment family:\\s*${options.familyCode}`, "i")).first()).toBeVisible();
  await page.getByRole("button", { name: new RegExp(options.packLabel, "i") }).click();
  await expect(page.getByText(new RegExp(`active pack:\\s*${options.packLabel}`, "i")).first()).toBeVisible();
}

async function previewFamilyExam(page: Page) {
  const previewResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/exams/advanced-builder/preview") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /preview exam/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok()).toBe(true);
  return (await previewResponse.json()) as {
    valid: boolean;
    resolved_exam?: {
      assessment_family_profile?: ProgramRegistryRecord["assessment_family_profile"];
    };
    sections?: Array<{
      family_contract?: {
        assessment_family_code?: string | null;
        negative_marking_scope?: string | null;
        negative_marking_recommended?: boolean;
        negative_marking_allowed?: boolean;
      };
    }>;
  };
}

async function preparePreviewableDraft(page: Page, seed: string) {
  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  await page.getByLabel(/exam title/i).fill(`PW Admin Authoring ${seed}`);
  await page.getByLabel(/exam code/i).fill(`PWAA-${seed}`);

  await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();
  await page.getByLabel(/selection mode/i).selectOption("subject_fallback");

  const sectionCards = page.locator(".advancedBuilderSectionCard");
  for (let index = await sectionCards.count() - 1; index >= 1; index -= 1) {
    await sectionCards
      .nth(index)
      .locator(".advancedBuilderSectionCardTop")
      .getByRole("button", { name: /^remove$/i })
      .click();
  }

  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/question count/i).fill("1");

  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }

  await firstSectionCard.locator(".advancedBuilderTopicRow").first().locator('input[type="number"]').fill("1");
}

test.describe("Admin family authoring contracts", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin builder surfaces family-aware authoring contracts for competitive and certification lanes", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const registry = await fetchAssessmentRegistry(page);
    expectAssessmentRegistryContracts(registry);

    await page.goto("/admin/exams/advanced?preset_pack=jee_mains_math");
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    await applyAdminTemplateScope(page);
    await alignAdminFamilyScope(page, {
      packLabel: "JEE Mains Math",
      programLabel: "Demo NEET Track",
      subjectLabel: "NEET Biology",
      familyCode: "competitive",
    });

    const competitiveInstituteId = await page.getByLabel(/select template institute/i).inputValue();
    const competitivePrograms = await fetchPrograms(page, competitiveInstituteId);
    const competitiveProgram = findProgramByFamily(competitivePrograms, "competitive");
    expect(competitiveProgram).not.toBeNull();

    await expect(page.getByText(/family profile/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /competitive defaults/i }).first()).toBeVisible();
    await expect(page.getByText(/assessment family:\s*competitive/i).first()).toBeVisible();
    await expect(page.getByText(questionTypeLabel(registry, "mcq_single")).first()).toBeVisible();
    await expect(page.getByText(questionTypeLabel(registry, "numeric_answer")).first()).toBeVisible();
    await expect(page.getByText(/negative marking default is on\./i).first()).toBeVisible();
    await preparePreviewableDraft(page, "COMP");

    let competitivePreview = await previewFamilyExam(page);
    expect(competitivePreview.valid).toBe(true);
    expectPreviewFamilyContract(competitivePreview, competitiveProgram!.assessment_family_profile ?? null);
    await expect(page.getByText(/preview refreshed\./i).first()).toBeVisible();

    await page.getByRole("tab", { name: /\bdelivery\b/i }).first().click();
    await page.getByLabel(/attempt policy/i).selectOption("unlimited_practice");
    await expect(page.getByText(/attempt contract checks/i).first()).toBeVisible();
    await expect(page.getByText(/diverge from the selected family contract/i).first()).toBeVisible();
    await expect(page.getByText(/numeric-entry questions are part of this family contract/i).first()).toBeVisible();

    competitivePreview = await previewFamilyExam(page);
    expect(competitivePreview.valid).toBe(true);
    expectPreviewFamilyContract(competitivePreview, competitiveProgram!.assessment_family_profile ?? null);

    await page.goto("/admin/exams/advanced?preset_pack=aws_practitioner");
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    await applyAdminTemplateScope(page);
    await alignAdminFamilyScope(page, {
      packLabel: "AWS Practitioner",
      programLabel: "Demo AWS Track",
      subjectLabel: "AWS Cloud Practitioner",
      familyCode: "certification",
    });

    const certificationInstituteId = await page.getByLabel(/select template institute/i).inputValue();
    const certificationPrograms = await fetchPrograms(page, certificationInstituteId);
    const certificationProgram = findProgramByFamily(certificationPrograms, "certification");
    expect(certificationProgram).not.toBeNull();

    await expect(page.getByRole("heading", { name: /certification defaults/i }).first()).toBeVisible();
    await expect(page.getByText(/assessment family:\s*certification/i).first()).toBeVisible();
    await expect(page.getByText(questionTypeLabel(registry, "short_answer")).first()).toBeVisible();
    await expect(page.getByText(/negative marking default is off\./i).first()).toBeVisible();
    await preparePreviewableDraft(page, "CERT");

    const numericAnswerTag = page.locator(".questionBankTag").filter({
      hasText: questionTypeLabel(registry, "numeric_answer"),
    });
    await expect(numericAnswerTag).toHaveCount(0);

    const certificationPreview = await previewFamilyExam(page);
    expect(certificationPreview.valid).toBe(true);
    expectPreviewFamilyContract(
      certificationPreview,
      certificationProgram!.assessment_family_profile ?? null,
    );
    await expect(page.getByText(/preview refreshed\./i).first()).toBeVisible();
  });
});
