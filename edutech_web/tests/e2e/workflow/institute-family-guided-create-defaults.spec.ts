import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const guidedFamilyScenarios = [
  {
    presetId: "neet_mock",
    programLabel: "Demo NEET Track (DM-NEET)",
    examCode: "PW-INST-NEET",
    familyLabel: "NEET",
    guidanceHeading: /neet mock guidance/i,
    checklist: [
      /keep this mock-first/i,
      /biology, chemistry, and physics blocks/i,
      /biology-heavy objective mix/i,
    ],
    learnerChecks: {
      allowSectionSwitching: false,
      allowReturnToPreviousSection: false,
      showResultImmediately: false,
      allowReviewAfterSubmit: true,
    },
    expectedStarCost: "200",
  },
  {
    presetId: "jee_mains_math",
    programLabel: "Demo NEET Track (DM-NEET)",
    examCode: "PW-INST-JEE",
    familyLabel: "JEE",
    guidanceHeading: /jee mains math guidance/i,
    checklist: [
      /challenge-oriented timed sections/i,
      /numeric-answer lane/i,
      /do not combine numeric-entry sections with negative marking/i,
    ],
    learnerChecks: {
      allowSectionSwitching: true,
      allowReturnToPreviousSection: false,
      showResultImmediately: false,
      allowReviewAfterSubmit: true,
    },
    expectedStarCost: "150",
  },
  {
    presetId: "gre_quant",
    programLabel: "Demo NEET Track (DM-NEET)",
    examCode: "PW-INST-GRE",
    familyLabel: "GRE",
    guidanceHeading: /gre quant guidance/i,
    checklist: [
      /formal graduate-readiness practice/i,
      /total-score-first reporting/i,
      /adaptive-feeling quantitative reasoning mix/i,
    ],
    learnerChecks: {
      allowSectionSwitching: false,
      allowReturnToPreviousSection: false,
      showResultImmediately: false,
      allowReviewAfterSubmit: true,
    },
    expectedStarCost: "120",
  },
  {
    presetId: "aws_practitioner",
    programLabel: "Demo AWS Track (DM-AWS)",
    examCode: "PW-INST-AWS",
    familyLabel: "AWS Certification",
    guidanceHeading: /aws practitioner guidance/i,
    checklist: [
      /organize the exam around aws domains or objectives/i,
      /scenario-based single-best-answer practice/i,
      /scenario-based objective mix across service domains|service-domain coverage broad enough/i,
    ],
    learnerChecks: {
      allowSectionSwitching: true,
      allowReturnToPreviousSection: true,
      showResultImmediately: true,
      allowReviewAfterSubmit: true,
    },
    expectedStarCost: "0",
  },
] as const;

function findPresetPack(
  packs: ExamPresetPackPayload[],
  presetId: string,
) {
  const pack = packs.find((item) => item.id === presetId) ?? null;
  expect(pack).not.toBeNull();
  return pack!;
}

async function selectProgram(page: Page, programLabel: string) {
  await page.locator('select[name="program"]').first().selectOption({ label: programLabel });
}

async function expectWizardIdentityHints(
  page: Page,
  options: {
    familyLabel: string;
    guidanceHeading: RegExp;
    checklist: readonly RegExp[];
  },
) {
  await expect(page.getByText(new RegExp(`^${options.familyLabel}$`, "i")).first()).toBeVisible();
  await expect(page.getByText(options.guidanceHeading).first()).toBeVisible();
  await expect(page.getByText(/execution checklist/i).first()).toBeVisible();
  for (const item of options.checklist) {
    await expect(page.getByText(item).first()).toBeVisible();
  }
}

async function continueToStep(page: Page, heading: RegExp) {
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(heading).first()).toBeVisible();
}

async function expectLearnerExperience(
  page: Page,
  options: {
    allowSectionSwitching: boolean;
    allowReturnToPreviousSection: boolean;
    showResultImmediately: boolean;
    allowReviewAfterSubmit: boolean;
  },
) {
  const sectionSwitching = page.getByRole("checkbox", { name: /allow section switching/i });
  const previousSection = page.getByRole("checkbox", { name: /allow return to previous section/i });
  const showResultImmediately = page.getByRole("checkbox", { name: /show result immediately/i });
  const allowReview = page.getByRole("checkbox", { name: /allow review after submit/i });

  if (options.allowSectionSwitching) {
    await expect(sectionSwitching).toBeChecked();
  } else {
    await expect(sectionSwitching).not.toBeChecked();
  }
  if (options.allowReturnToPreviousSection) {
    await expect(previousSection).toBeChecked();
  } else {
    await expect(previousSection).not.toBeChecked();
  }
  if (options.showResultImmediately) {
    await expect(showResultImmediately).toBeChecked();
  } else {
    await expect(showResultImmediately).not.toBeChecked();
  }
  if (options.allowReviewAfterSubmit) {
    await expect(allowReview).toBeChecked();
  } else {
    await expect(allowReview).not.toBeChecked();
  }
}

test.describe("Institute family guided create defaults", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute guided create wizard applies NEET, JEE, GRE, and AWS family defaults from the seeded program lane", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const presetPayload = await fetchPresetPacks(page);
    for (const scenario of guidedFamilyScenarios) {
      const pack = findPresetPack(presetPayload.results, scenario.presetId);

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const title = page.locator('input[name="title"]').first();
      const code = page.locator('input[name="code"]').first();
      await title.fill(`PW Institute Guided Defaults ${scenario.presetId}`);
      await code.fill(scenario.examCode);

      await selectProgram(page, scenario.programLabel);
      if (scenario.presetId !== "neet_mock" && scenario.presetId !== "aws_practitioner") {
        await page.getByRole("button", { name: new RegExp(scenario.familyLabel, "i") }).click();
      }

      await expectWizardIdentityHints(page, {
        familyLabel: scenario.familyLabel,
        guidanceHeading: scenario.guidanceHeading,
        checklist: scenario.checklist,
      });

      await expect(page.locator('input[name="duration_minutes"]').first()).toHaveValue(
        pack.builderDefaults?.exam?.durationMinutes ?? "",
      );
      await expect(page.locator('input[name="max_attempts"]').first()).toHaveValue(
        "1",
      );
      await expect(page.locator('input[name="economy_star_cost"]').first()).toHaveValue(
        scenario.expectedStarCost,
      );

      await continueToStep(page, /schedule and delivery/i);
      await expect(page.locator('select[name="exam_type"]').first()).toHaveValue(
        pack.builderDefaults?.exam?.examType ?? "",
      );
      await expect(page.locator('input[name="duration_minutes"]').first()).toHaveValue(
        pack.builderDefaults?.exam?.durationMinutes ?? "",
      );

      await continueToStep(page, /runtime rules/i);
      await expect(page.locator('select[name="timer_mode"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.timerMode ?? "",
      );
      await expect(page.locator('select[name="navigation_mode"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.navigationMode ?? "",
      );
      await expect(page.locator('select[name="attempt_policy"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.attemptPolicy ?? "",
      );
      await expect(page.locator('select[name="result_publish_mode"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.resultPublishMode ?? "",
      );
      await expect(page.locator('select[name="review_mode"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.reviewMode ?? "",
      );
      await expect(page.locator('select[name="security_mode"]').first()).toHaveValue(
        pack.builderDefaults?.delivery?.securityMode ?? "",
      );

      await continueToStep(page, /learner experience/i);
      await expectLearnerExperience(page, scenario.learnerChecks);
    }
  });
});
