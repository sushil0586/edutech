import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  countPrograms,
  countSubjects,
  countTopics,
  createDisposableInstitute,
  deleteDisposableInstitute,
  expectAcademicCounts,
  fetchFeatureEntitlements,
  fetchPrograms,
  fetchQuestionBankPackages,
  fetchQuestionEntitlements,
  fetchSubjects,
  fetchTopics,
  getAdminAccessToken,
  selectFirstNonEmptyOption,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";
import { AdminInstituteOnboardingPage } from "../page-objects/admin/admin-institute-onboarding.po";

const mutableAdminOnboardingTypesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);
type PresetApplyResult = {
  summary: {
    academic_years: { created: number; updated: number };
    programs: { created: number; updated: number };
    subjects: { created: number; updated: number };
    topics: { created: number; updated: number };
  };
  access_results?: {
    question_bank_package: {
      enabled: boolean;
      package_code: string | null;
      status: string;
    };
    shared_library: {
      enabled: boolean;
      feature_code: string;
      status: string;
      source_package_code: string | null;
    };
    advanced_builder: {
      enabled: boolean;
      feature_code: string;
      status: string;
      source_package_code: string | null;
    };
  };
  question_assignment_results?: {
    mode?: string;
    status?: string;
  };
};

function createdOrUpdatedCount(bucket: { created: number; updated: number }) {
  return bucket.created + bucket.updated;
}

test.describe("Admin onboarding types", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
      "admin onboarding mode browser coverage",
    ),
  );

  test("@workflow @mutable admin can complete manual full-preset onboarding on a fresh institute", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Full ${seed}`,
        code: `PWF${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await expect(page.getByLabel(/onboarding profile/i)).toHaveValue("BLANK_INSTITUTE");
      await onboardingPage.setAcademicYear(`2033-2034 Full ${seed}`);
      await onboardingPage.selectApplyMode("full");
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok(), await applyResponse.text()).toBe(true);

      await expect(page.getByText(/onboarding run/i).first()).toBeVisible();
      await expect(page.getByText(/manual/i).first()).toBeVisible();
      await expect(page.getByText(/audit returned no immediate structural findings|audit returned/i).first()).toBeVisible();
      await onboardingPage.expectReadySummary(institute.name);

      expect(await countPrograms(page, institute.id)).toBeGreaterThanOrEqual(1);
      expect(await countSubjects(page, institute.id)).toBeGreaterThanOrEqual(5);
      expect(await countTopics(page, institute.id)).toBeGreaterThan(20);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard an institute with only selected subjects", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Subjects ${seed}`,
        code: `PWS${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2033-2034 Subjects ${seed}`);
      await onboardingPage.selectApplyMode("selected_subjects");
      await page.waitForTimeout(500);
      const subjectsSection = page.locator("section.contentCard").filter({
        has: page.getByText(/select subjects to apply/i).first(),
      }).first();
      await expect(subjectsSection).toBeVisible();
      const mathCheckbox = subjectsSection.getByRole("checkbox", { name: /math/i });
      const scienceCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Science 18 topics · CLS7-SCI",
        exact: true,
      });
      const socialScienceCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Social Science 12 topics · CLS7-SST",
        exact: true,
      });
      const computerCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Computer 15 topics · CLS7-COMP",
        exact: true,
      });
      const generalKnowledgeCheckbox = subjectsSection.getByRole("checkbox", {
        name: "General Knowledge 12 topics · CLS7-GK",
        exact: true,
      });
      await expect(mathCheckbox).toBeVisible();
      for (const checkbox of [socialScienceCheckbox, computerCheckbox, generalKnowledgeCheckbox]) {
        if (await checkbox.isChecked()) {
          await checkbox.click();
        }
        await expect.poll(async () => checkbox.isChecked()).toBe(false);
      }
      await expect.poll(async () => mathCheckbox.isChecked()).toBe(true);
      await expect.poll(async () => scienceCheckbox.isChecked()).toBe(true);
      await page.getByRole("button", { name: /preview changes/i }).click();
      await expect(page.getByText(/preview summary/i).first()).toBeVisible();
      await expect(page.getByText(/subjects/i).first()).toBeVisible();
      await expect(page.getByText(/topics to create/i).first()).toBeVisible();
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;
      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding run/i).first()).toBeVisible();
      await expect(page.getByText(/manual/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await onboardingPage.expectReadySummary(institute.name);

      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(2);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(50);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard an institute with only selected topic groups", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Topics ${seed}`,
        code: `PWT${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2041-2042 Topics ${seed}`, "2041-04-01", "2042-03-31");
      await onboardingPage.selectApplyMode("selected_topic_groups");
      await page.waitForTimeout(500);
      const topicGroupsSection = page.locator("section.contentCard").filter({
        has: page.getByText(/select topic groups to apply/i).first(),
      }).first();
      await expect(topicGroupsSection).toBeVisible();
      await expect(topicGroupsSection.getByRole("checkbox", { name: /numbers and place value/i })).toBeVisible();
      for (const label of [
        "Arithmetic and Decimals 3 child topics · MATH-ARITH",
        "Introductory Algebra 3 child topics · MATH-ALGEBRA",
        "Geometry 3 child topics · MATH-GEOMETRY",
        "Fractions 3 child topics · MATH-FRACTIONS",
        "Logical and Computational Thinking 3 child topics · MATH-LOGIC",
      ]) {
        const checkbox = topicGroupsSection.getByRole("checkbox", { name: label, exact: true });
        await checkbox.click();
        await expect.poll(async () => checkbox.isChecked()).toBe(false);
        await page.waitForTimeout(200);
      }
      await page.getByRole("button", { name: /preview changes/i }).click();
      await expect(page.getByText(/preview summary/i).first()).toBeVisible();
      await expect(page.getByText(/82 topics to (create|update)/i)).toBeVisible();
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      if (!applyResponse.ok()) {
        throw new Error(`selected_topic_groups apply failed: ${applyResponse.status()} ${await applyResponse.text()}`);
      }
      const applyResult = (await applyResponse.json()) as PresetApplyResult;
      expect(createdOrUpdatedCount(applyResult.summary.academic_years)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(5);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(82);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard a fresh institute with the Class 8 Math preset through master defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Class8 ${seed}`,
        code: `PW8${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2035-2036 Class8 ${seed}`);
      await onboardingPage.selectAcademicPreset("class_8_cbse_core");
      await onboardingPage.selectApplyMode("full");

      await onboardingPage.previewChanges();
      await onboardingPage.expectPreviewSummary();
      await expect(page.getByText(/1 subject/i).first()).toBeVisible();
      await expect(page.getByText(/8 topics to create/i).first()).toBeVisible();

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(1);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(8);

      await expectAcademicCounts(page, institute.id, {
        programs: 1,
        subjects: 1,
        topics: 8,
      });

      const programs = await fetchPrograms(page, institute.id);
      const class8Program = programs.find((item) => item.code === "CLS8");
      expect(class8Program).toBeTruthy();

      const subjects = await fetchSubjects(page, institute.id);
      const class8Math = subjects.find((item) => item.code === "CLS8-MATH");
      expect(class8Math).toBeTruthy();
      expect(class8Math?.program).toBe(class8Program?.id);

      const topics = await fetchTopics(page, institute.id, class8Math!.id);
      const parentTopics = topics.filter((item) => item.parent_topic === null);
      const childTopics = topics.filter((item) => item.parent_topic !== null);
      expect(parentTopics.map((item) => item.name).sort()).toEqual([
        "Algebraic Expressions and Identities",
        "Comparing Quantities",
        "Linear Equations in One Variable",
        "Rational Numbers",
      ]);
      expect(childTopics).toHaveLength(4);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin can grant question-bank and advanced-builder access during onboarding from master defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Access ${seed}`,
        code: `PWA${seed.slice(-5)}`,
      });
      instituteId = institute.id;
      const adminAccessToken = await getAdminAccessToken(page);
      expect(adminAccessToken).toBeTruthy();

      const packageCatalog = await fetchQuestionBankPackages(page);
      const eligiblePackage = packageCatalog.find(
        (pkg) => pkg.ownership_type === "platform" && pkg.is_active !== false,
      );
      if (!eligiblePackage) {
        test.skip(true, "No active platform-managed question-bank package is available for master-default onboarding.");
      }
      const eligiblePackageSnapshot = eligiblePackage!;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2036-2037 Access ${seed}`);
      await onboardingPage.selectAcademicPreset("class_8_cbse_core");
      await onboardingPage.selectApplyMode("full");
      await onboardingPage.setQuestionBankAccess("enabled");
      await expect
        .poll(async () => page.getByLabel(/default question-bank package/i).inputValue())
        .toBe(eligiblePackageSnapshot.code);
      await onboardingPage.setQuestionLinkingMode("access_only");
      await onboardingPage.setAdvancedBuilderAccess("enabled");

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      await expect(page.getByText(/package access granted|package access reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/shared library granted|shared library reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/advanced builder granted|advanced builder reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/linking mode grant access only/i).first()).toBeVisible();
      await expect(page.getByText(/manual linking still required/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await onboardingPage.expectFollowUpSummary(institute.name);
      await expect(
        page.getByTestId("onboarding-completion-summary").getByText(/staff still need to link questions manually/i),
      ).toBeVisible();
      await expect(
        page.getByTestId("onboarding-recovery-actions").getByText(/manual linking is still the next step/i),
      ).toBeVisible();
      await expect(
        page.getByTestId("onboarding-recovery-actions").getByText(/shared-library path and link the right questions into the local bank/i),
      ).toBeVisible();

      expect(applyResult.access_results?.question_bank_package.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        applyResult.access_results?.question_bank_package.status ?? "",
      );
      expect(applyResult.access_results?.question_bank_package.package_code).toBeTruthy();
      expect(applyResult.access_results?.shared_library.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(applyResult.access_results?.shared_library.status ?? "");
      expect(applyResult.access_results?.shared_library.feature_code).toBe("QUESTION_BANK_SHARED_LIBRARY");
      expect(applyResult.access_results?.shared_library.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
      expect(applyResult.access_results?.advanced_builder.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        applyResult.access_results?.advanced_builder.status ?? "",
      );
      expect(applyResult.access_results?.advanced_builder.feature_code).toBe("ADVANCED_EXAM_BUILDER");
      expect(applyResult.question_assignment_results?.mode).toBe("access_only");
      expect(applyResult.question_assignment_results?.status).toBe("completed");

      const questionEntitlements = await fetchQuestionEntitlements(page, adminAccessToken);
      const packageEntitlement = questionEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.question_bank_package_code === applyResult.access_results?.question_bank_package.package_code,
      );
      expect(packageEntitlement).toBeTruthy();
      expect(packageEntitlement?.status?.toLowerCase()).toBe("active");

      const featureEntitlements = await fetchFeatureEntitlements(page, adminAccessToken);
      const builderEntitlement = featureEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.feature_code === "ADVANCED_EXAM_BUILDER",
      );
      const sharedLibraryEntitlement = featureEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.feature_code === "QUESTION_BANK_SHARED_LIBRARY",
      );
      expect(sharedLibraryEntitlement).toBeTruthy();
      expect(sharedLibraryEntitlement?.status?.toLowerCase()).toBe("active");
      expect(sharedLibraryEntitlement?.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
      expect(builderEntitlement).toBeTruthy();
      expect(builderEntitlement?.status?.toLowerCase()).toBe("active");
      expect(builderEntitlement?.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin can reapply onboarding on an existing institute without duplicating academic structure", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Reapply ${seed}`,
        code: `PWR${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2037-2038 Reapply ${seed}`);
      await onboardingPage.selectApplyMode("full");
      const firstApplyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const firstApplyResponse = await firstApplyResponsePromise;
      expect(firstApplyResponse.ok(), await firstApplyResponse.text()).toBe(true);
      await onboardingPage.expectOnboardingOutcomeSummary(institute.name);

      const initialProgramCount = await countPrograms(page, institute.id);
      const initialSubjectCount = await countSubjects(page, institute.id);
      const initialTopicCount = await countTopics(page, institute.id);

      expect(initialProgramCount).toBeGreaterThanOrEqual(1);
      expect(initialSubjectCount).toBeGreaterThanOrEqual(5);
      expect(initialTopicCount).toBeGreaterThan(20);

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2037-2038 Reapply ${seed}`);
      await onboardingPage.selectApplyMode("full");
      await onboardingPage.setQuestionBankAccess("enabled");
      await onboardingPage.setQuestionLinkingMode("access_only");
      await onboardingPage.setAdvancedBuilderAccess("enabled");

      const reapplyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const reapplyResponse = await reapplyResponsePromise;
      expect(reapplyResponse.ok()).toBe(true);
      const reapplyResult = (await reapplyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await onboardingPage.expectFollowUpSummary(institute.name);
      await expect(
        page.getByTestId("onboarding-recovery-actions").getByText(/manual linking is still the next step/i),
      ).toBeVisible();

      expect(createdOrUpdatedCount(reapplyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(reapplyResult.summary.subjects)).toBeGreaterThanOrEqual(initialSubjectCount);
      expect(createdOrUpdatedCount(reapplyResult.summary.topics)).toBeGreaterThanOrEqual(initialTopicCount);
      expect(reapplyResult.access_results?.question_bank_package.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        reapplyResult.access_results?.advanced_builder.status ?? "",
      );
      expect(reapplyResult.question_assignment_results?.mode).toBe("access_only");

      await expect.poll(async () => countPrograms(page, institute.id)).toBe(initialProgramCount);
      await expect.poll(async () => countSubjects(page, institute.id)).toBe(initialSubjectCount);
      await expect.poll(async () => countTopics(page, institute.id)).toBe(initialTopicCount);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable admin sees strong operator warnings for incomplete onboarding access setup before apply", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Onboarding Warning ${seed}`,
        code: `PWW${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2038-2039 Warning ${seed}`);
      await onboardingPage.selectApplyMode("full");
      await onboardingPage.setQuestionBankAccess("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("");
      await onboardingPage.setQuestionLinkingMode("access_only");
      await onboardingPage.setAdvancedBuilderAccess("disabled");

      await onboardingPage.expectWarning(/question-bank access is enabled, but no package is selected yet/i);
      await onboardingPage.expectWarning(/you selected grant access only/i);
      await onboardingPage.expectWarning(/question-bank access is enabled while advanced builder is disabled/i);

      const previewResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/preview$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /preview changes/i }).click();
      const previewResponse = await previewResponsePromise;
      expect(previewResponse.ok()).toBe(false);
      await expect(page.getByText(/select a question-bank package when package access is enabled/i)).toBeVisible();
      await expect(page.getByText(/preview summary/i)).toHaveCount(0);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });
});
