import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";

const familyScenarios = [
  {
    presetId: "neet_mock",
    programLabel: "Demo NEET Track",
    subjectLabel: "NEET Biology",
    packLabel: /neet mock/i,
    defaultsHeading: /competitive defaults/i,
    authoringLane: /full mock structure first/i,
    checklist: [
      /keep the exam mock-first/i,
      /biology, chemistry, and physics blocks/i,
      /biology-heavy objective mix/i,
    ],
    compositionGuidance: /recommended sections:\s*biology \(45\).+chemistry \(45\).+physics \(45\)/i,
    familyRecommendationPack: /neet mock/i,
    familyRecommendationSecurity: /strict.+post-submit review after the full attempt closes/i,
    adminTemplateInstituteLabel: "Demo Learning Institute (DLI001)",
  },
  {
    presetId: "jee_mains_math",
    programLabel: "JEE 2026 Foundation",
    subjectLabel: "Mathematics",
    packLabel: /jee mains math/i,
    defaultsHeading: /competitive defaults/i,
    authoringLane: /harder timed mock behavior/i,
    checklist: [
      /bias toward challenge-heavy timed sections/i,
      /include a numeric-answer lane/i,
      /do not pair numeric-entry sections with negative marking/i,
    ],
    compositionGuidance: /recommended sections:\s*objective \(20\).+numeric \(10\)/i,
    familyRecommendationPack: /jee mains math/i,
    familyRecommendationSecurity: /strict.+restrict review until submit so pacing stays realistic/i,
    adminTemplateInstituteLabel: "Demo Learning Institute (DLI001)",
  },
  {
    presetId: "gre_quant",
    programLabel: "GRE 2026 Quant Prep",
    subjectLabel: "Quantitative Reasoning",
    packLabel: /gre quant/i,
    defaultsHeading: /competitive defaults/i,
    authoringLane: /strong timed sectional drafts/i,
    checklist: [
      /prefer formal timed sections and graduate-readiness wording/i,
      /keep result and review settings aligned to total-score-first reporting/i,
      /adaptive-feeling quantitative reasoning mix/i,
    ],
    compositionGuidance: /recommended sections:\s*quant section 1 \(20\).+quant section 2 \(20\)/i,
    familyRecommendationPack: /gre quant/i,
    familyRecommendationSecurity: /moderate.+formal post-submit review with section-aware guidance/i,
    adminTemplateInstituteLabel: "Demo Learning Institute (DLI001)",
  },
  {
    presetId: "aws_practitioner",
    programLabel: "Demo AWS Track",
    subjectLabel: "AWS Cloud Practitioner",
    packLabel: /aws practitioner/i,
    defaultsHeading: /certification defaults/i,
    authoringLane: /keep authoring practice-first/i,
    checklist: [
      /organize sections around aws domains or objectives/i,
      /scenario-driven single-best-answer practice/i,
      /scenario-based objective mix across service domains|service-domain coverage broad enough/i,
    ],
    compositionGuidance: /recommended sections:.+cloud concepts.+25/i,
    familyRecommendationPack: /aws practitioner/i,
    familyRecommendationSecurity: /standard.+practice-first review with explanation-friendly post-submit access/i,
    adminTemplateInstituteLabel: "AWS Learning Academy (AWS001)",
  },
] as const;

async function applyAdminTemplateScope(page: Page, instituteLabel: string) {
  await page.getByLabel(/select template institute/i).selectOption({ label: instituteLabel });
  await page.getByRole("button", { name: /^apply$/i }).click();
  const instituteName = instituteLabel.split(" (")[0];
  await expect(page.getByText(new RegExp(`${instituteName} template scope`, "i"))).toBeVisible();
}

async function alignBuilderFamilyScope(
  page: Page,
  options: {
    programLabel: string;
    subjectLabel: string;
    packLabel: RegExp;
  },
) {
  const programField = page
    .getByRole("combobox", {
      name: /program/i,
    })
    .first();
  const matchingProgramOption = programField
    .locator("option")
    .filter({ hasText: new RegExp(`^${options.programLabel}$`, "i") });
  if ((await matchingProgramOption.count()) === 0) {
    return false;
  }
  await programField.selectOption({ label: options.programLabel });
  await expect
    .poll(async () => {
      return programField.evaluate((element) => {
        const select = element as HTMLSelectElement;
        return select.selectedOptions[0]?.textContent?.trim() ?? "";
      });
    })
    .not.toBe("");
  const currentProgramLabel = await programField.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return select.selectedOptions[0]?.textContent?.trim() ?? "";
  });
  if (currentProgramLabel !== options.programLabel) {
    return false;
  }

  const subjectField = page
    .getByRole("combobox", {
      name: /primary subject|subject/i,
    })
    .first();
  const matchingSubjectOption = subjectField
    .locator("option")
    .filter({ hasText: new RegExp(`^${options.subjectLabel}$`, "i") });
  if ((await matchingSubjectOption.count()) === 0) {
    return false;
  }
  await subjectField.selectOption({ label: options.subjectLabel });
  await expect
    .poll(async () => {
      return subjectField.evaluate((element) => {
        const select = element as HTMLSelectElement;
        return select.selectedOptions[0]?.textContent?.trim() ?? "";
      });
    })
    .not.toBe("");
  const currentSubjectLabel = await subjectField.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return select.selectedOptions[0]?.textContent?.trim() ?? "";
  });
  if (currentSubjectLabel !== options.subjectLabel) {
    return false;
  }
  const subjectActivationWarning = page.getByText(
    /choose a subject with active topics before applying a preset pack/i,
  );
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByRole("button", { name: options.packLabel }).click();
    if (!(await subjectActivationWarning.isVisible().catch(() => false))) {
      const activePack = page.getByText(/active pack:/i).first();
      if (await activePack.isVisible().catch(() => false)) {
        await expect(activePack).toContainText(options.packLabel);
      }
      return true;
    }
    await page.waitForTimeout(750);
  }
  return false;
}

async function expectFamilyGuidance(
  page: Page,
  options: {
    defaultsHeading: RegExp;
    authoringLane: RegExp;
    checklist: readonly RegExp[];
    compositionGuidance: RegExp;
    familyRecommendationPack: RegExp;
    familyRecommendationSecurity: RegExp;
  },
) {
  await expect(page.getByRole("heading", { name: options.defaultsHeading }).first()).toBeVisible();
  await expect(page.getByText(/authoring lane/i).first()).toBeVisible();
  await expect(page.getByText(options.authoringLane).first()).toBeVisible();
  await expect(page.getByText(/execution checklist/i).first()).toBeVisible();
  for (const item of options.checklist) {
    await expect(page.getByText(item).first()).toBeVisible();
  }

  await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();
  await expect(page.getByText(/composition guidance/i).first()).toBeVisible();
  await expect(page.getByText(options.compositionGuidance).first()).toBeVisible();

  await expect(page.getByText(/family recommendation/i).first()).toBeVisible();
  await expect(page.getByText(options.familyRecommendationPack).first()).toBeVisible();
  await expect(page.getByText(options.familyRecommendationSecurity).first()).toBeVisible();
}

async function expectScenario(page: Page, basePath: "/admin/exams/advanced" | "/institute/exams/advanced") {
  for (const scenario of familyScenarios) {
    await page.goto(`${basePath}?preset_pack=${scenario.presetId}`);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
    if (basePath === "/institute/exams/advanced") {
      const blockedHeading = page.getByRole("heading", {
        name: /advanced exam builder is not enabled for this institute yet/i,
      }).first();
      if (await blockedHeading.isVisible().catch(() => false)) {
        await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
        await expect(page.getByText(/active institute feature entitlement/i).first()).toBeVisible();
        return;
      }
    }
    if (basePath === "/admin/exams/advanced") {
      await applyAdminTemplateScope(
        page,
        scenario.adminTemplateInstituteLabel ?? "Demo Learning Institute (DLI001)",
      );
    }
    const aligned = await alignBuilderFamilyScope(page, {
      programLabel: scenario.programLabel,
      subjectLabel: scenario.subjectLabel,
      packLabel: scenario.packLabel,
    });
    if (!aligned) {
      continue;
    }
    await expectFamilyGuidance(page, {
      defaultsHeading: scenario.defaultsHeading,
      authoringLane: scenario.authoringLane,
      checklist: scenario.checklist,
      compositionGuidance: scenario.compositionGuidance,
      familyRecommendationPack: scenario.familyRecommendationPack,
      familyRecommendationSecurity: scenario.familyRecommendationSecurity,
    });
  }
}

test.describe("Family advanced builder guidance", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Admin or institute Playwright credentials are not configured.",
  );

  test("@workflow admin and institute advanced builder surface NEET, JEE, GRE, and AWS family guidance", async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const adminPage = await browser.newPage();
    await loginAsRole(adminPage, "admin");
    await expectAdminWorkspace(adminPage);
    await expectScenario(adminPage, "/admin/exams/advanced");
    await adminPage.close();

    const institutePage = await browser.newPage();
    await loginAsRole(institutePage, "institute");
    await expectInstituteWorkspace(institutePage);
    await expectScenario(institutePage, "/institute/exams/advanced");
    await institutePage.close();
  });
});
