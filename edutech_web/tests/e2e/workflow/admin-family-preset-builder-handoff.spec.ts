import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const familyPresetIds = [
  "neet_mock",
  "jee_mains_math",
  "gre_quant",
  "aws_practitioner",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function adminPrimarySubjectSelect(page: import("@playwright/test").Page) {
  return page
    .locator(".advancedBuilderField", {
      has: page.getByText(/^(Primary subject|Subject)$/i),
    })
    .locator("select")
    .first();
}

async function selectFirstUsableSubject(
  subjectSelect: ReturnType<typeof adminPrimarySubjectSelect>,
  preferredLabel?: string,
) {
  await expect(subjectSelect).toBeEnabled();
  await expect
    .poll(
      async () =>
        subjectSelect.locator("option").evaluateAll((nodes) =>
          nodes.filter((node) => (node as HTMLOptionElement).value.trim().length > 0).length,
        ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  const resolvedOptions = await subjectSelect.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        label: ((node as HTMLOptionElement).label || node.textContent || "").trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  const preferred = preferredLabel
    ? resolvedOptions.find((option) => option.label === preferredLabel)
    : null;
  const chosen = preferred ?? resolvedOptions[0];
  expect(chosen).toBeTruthy();
  await expect
    .poll(
      async () =>
        subjectSelect.locator("option").evaluateAll((nodes, selectedValue) => {
          return nodes.some((node) => (node as HTMLOptionElement).value === selectedValue);
        }, chosen.value),
      { timeout: 30000 },
    )
    .toBe(true);
  await subjectSelect.selectOption(chosen.value);
  return chosen;
}

async function alignAdminScopeWithPresetFamily(
  page: import("@playwright/test").Page,
  pack: ExamPresetPackPayload,
) {
  await page.getByLabel(/select template institute/i).selectOption("Demo Learning Institute (DLI001)");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();

  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  const programLabel = pack.programFamilyCode === "certification" ? "Demo AWS Track" : "Demo NEET Track";
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select")
    .selectOption({ label: programLabel });
  const subjectSelect = adminPrimarySubjectSelect(page);
  await expect(subjectSelect).toBeEnabled();
  const preferredSubjectLabel =
    pack.programFamilyCode === "certification" ? "AWS Cloud Practitioner" : undefined;
  await selectFirstUsableSubject(subjectSelect, preferredSubjectLabel);
  await expect(page.getByText(new RegExp(`Assessment family:\\s*${pack.programFamilyCode}`, "i"))).toBeVisible();
  await page.getByRole("button", { name: new RegExp(pack.label, "i") }).click();
  await expect(page.getByText(new RegExp(`active pack:\\s*${escapeRegExp(pack.label)}`, "i"))).toBeVisible();
}

function requiredBuilderDefaults(pack: ExamPresetPackPayload) {
  expect(pack.builderDefaults).toBeTruthy();
  expect(pack.builderDefaults?.exam).toBeTruthy();
  expect(pack.builderDefaults?.delivery).toBeTruthy();
  expect(pack.builderDefaults?.sections?.length).toBeGreaterThan(0);
  return pack.builderDefaults!;
}

test.describe("Admin family preset builder handoff", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin preset-pack handoff seeds NEET, JEE, GRE, and AWS builder defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const presetPayload = await fetchPresetPacks(page);

    for (const presetId of familyPresetIds) {
      const pack = presetPayload.results.find((item) => item.id === presetId);
      expect(pack).toBeTruthy();
      const builderDefaults = requiredBuilderDefaults(pack!);

      await page.goto(`/admin/exams/advanced?preset_pack=${encodeURIComponent(presetId)}`);
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
      await alignAdminScopeWithPresetFamily(page, pack!);

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
