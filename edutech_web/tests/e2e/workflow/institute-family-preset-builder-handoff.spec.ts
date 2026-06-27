import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const familyPresetIds = [
  "neet_mock",
  "jee_mains_math",
  "gre_quant",
  "aws_practitioner",
  "ielts_academic",
  "pte_academic",
] as const;

function requiredBuilderDefaults(pack: ExamPresetPackPayload) {
  expect(pack.builderDefaults).toBeTruthy();
  expect(pack.builderDefaults?.exam).toBeTruthy();
  expect(pack.builderDefaults?.delivery).toBeTruthy();
  expect(pack.builderDefaults?.sections?.length).toBeGreaterThan(0);
  return pack.builderDefaults!;
}

test.describe("Institute family preset builder handoff", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute preset-pack handoff seeds NEET, JEE, GRE, AWS, IELTS, and PTE builder defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const presetPayload = await fetchPresetPacks(page);

    for (const presetId of familyPresetIds) {
      const pack = presetPayload.results.find((item) => item.id === presetId);
      expect(pack).toBeTruthy();
      const builderDefaults = requiredBuilderDefaults(pack!);

      await page.goto(`/institute/exams/advanced?preset_pack=${encodeURIComponent(presetId)}`);
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
      await expect(
        page.getByText(new RegExp(`active pack:\\s*${pack!.label}`, "i")),
      ).toBeVisible({ timeout: 30000 });

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
