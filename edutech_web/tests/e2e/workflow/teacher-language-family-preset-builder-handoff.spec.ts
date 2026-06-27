import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { fetchPrograms, type ProgramRegistryRecord } from "../helpers/assessment-family";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const languagePresetIds = ["ielts_academic", "pte_academic"] as const;
const languageProgramLabel = "Demo IELTS Track";
const languageSubjectLabel = "IELTS Academic Skills";

function requiredBuilderDefaults(pack: ExamPresetPackPayload) {
  expect(pack.builderDefaults).toBeTruthy();
  expect(pack.builderDefaults?.exam).toBeTruthy();
  expect(pack.builderDefaults?.delivery).toBeTruthy();
  expect(pack.builderDefaults?.sections?.length).toBeGreaterThan(0);
  return pack.builderDefaults!;
}

function findProgramByFamily(programs: ProgramRegistryRecord[], familyCode: string) {
  return (
    programs.find((program) => program.assessment_family_profile?.code === familyCode) ??
    programs.find((program) =>
      familyCode === "language_proficiency"
        ? /ielts|pte|toefl|language/i.test(`${program.name} ${program.code}`)
        : false,
    ) ??
    null
  );
}

async function alignTeacherScopeWithLanguageFamily(page: Page, pack: ExamPresetPackPayload) {
  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select")
    .selectOption({ label: languageProgramLabel });
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Subject$/i) })
    .locator("select")
    .selectOption({ label: languageSubjectLabel });
  await page.getByRole("button", { name: new RegExp(pack.label, "i") }).click();
  await expect(
    page.getByText(new RegExp(`active pack:\\s*${pack.label}`, "i")),
  ).toBeVisible({ timeout: 30000 });
}

test.describe("Teacher language family preset builder handoff", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher preset-pack handoff seeds IELTS and PTE builder defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const programs = await fetchPrograms(page);
    const languageProgram = findProgramByFamily(programs, "language_proficiency");
    test.skip(!languageProgram, "Teacher scope does not expose a language proficiency program.");

    const presetPayload = await fetchPresetPacks(page);

    for (const presetId of languagePresetIds) {
      const pack = presetPayload.results.find((item) => item.id === presetId);
      expect(pack).toBeTruthy();
      expect(pack?.familyId).toBe("language_proficiency");
      expect(pack?.programFamilyCode).toBe("language_proficiency");
      const builderDefaults = requiredBuilderDefaults(pack!);

      await page.goto(`/teacher/exams/advanced?preset_pack=${encodeURIComponent(presetId)}`);
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
      await expect(
        page.getByText(new RegExp(`active pack:\\s*${pack!.label}`, "i")),
      ).toBeVisible({ timeout: 30000 });

      await alignTeacherScopeWithLanguageFamily(page, pack!);

      await expect(page.getByLabel(/exam type/i)).toHaveValue(builderDefaults.exam?.examType ?? "");
      await expect(page.getByRole("spinbutton", { name: "Duration in minutes", exact: true })).toHaveValue(
        builderDefaults.exam?.durationMinutes ?? "",
      );

      await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();
      const sectionCards = page.locator(".advancedBuilderSectionCard");
      await expect(sectionCards).toHaveCount(builderDefaults.sections?.length ?? 0);

      for (const [index, section] of (builderDefaults.sections ?? []).entries()) {
        const sectionCard = sectionCards.nth(index);
        await expect(sectionCard.getByLabel(/section name/i)).toHaveValue(section.name ?? "");
        await expect(sectionCard.getByLabel(/question count/i)).toHaveValue(String(section.questionCount ?? ""));
        await expect(sectionCard.getByLabel(/negative marks/i)).toHaveValue(
          section.negativeMarksPerQuestion ?? "",
        );
      }

      await page.getByRole("tab", { name: /\bdelivery\b/i }).first().click();
      await expect(page.getByLabel(/timer mode/i)).toHaveValue(
        builderDefaults.delivery?.timerMode ?? "",
      );
      await expect(page.getByLabel(/navigation mode/i)).toHaveValue(
        builderDefaults.delivery?.navigationMode ?? "",
      );
      await expect(page.getByLabel(/attempt policy/i)).toHaveValue(
        builderDefaults.delivery?.attemptPolicy ?? "",
      );
      await expect(page.getByLabel(/security mode/i)).toHaveValue(
        builderDefaults.delivery?.securityMode ?? "",
      );
      await expect(page.getByLabel(/result publish mode/i)).toHaveValue(
        builderDefaults.delivery?.resultPublishMode ?? "",
      );
      await expect(page.getByLabel(/review mode/i)).toHaveValue(
        builderDefaults.delivery?.reviewMode ?? "",
      );
    }
  });
});
