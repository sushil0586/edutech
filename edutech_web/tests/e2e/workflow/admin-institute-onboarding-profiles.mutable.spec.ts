import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  countPrograms,
  countSubjects,
  countTopics,
  deleteDisposableInstitute,
  fetchFeatureEntitlements,
  fetchInstituteOnboardingRunDetail,
  fetchInstituteOnboardingRuns,
  fetchInstituteOnboardingTasks,
  fetchQuestionEntitlements,
  getAdminAccessToken,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";
import { AdminInstituteOnboardingPage } from "../page-objects/admin/admin-institute-onboarding.po";

const mutableAdminOnboardingProfilesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);

type BrowserCreatedInstitute = {
  id: string;
  name: string;
  code: string;
  onboarding_run_id: string | null;
  onboarding_run_status?: string | null;
};

type OnboardingRunRecord = {
  id: string;
  profile_code?: string;
  status?: string;
};

type OnboardingRunDetailRecord = {
  profile_code?: string;
  status?: string;
  source?: string;
  resolved_config_json?: {
    profile_code?: string;
  } | null;
};

type OnboardingTaskRecord = {
  task_code?: string;
  status?: string;
};

async function createInstituteFromBrowser(
  page: Page,
  profileCode: "BLANK_INSTITUTE" | "SCHOOL_STARTER" | "TRIAL_FULL_ACCESS",
) {
  const seed = uniqueOnboardingSeed();
  const instituteName = `PW ${profileCode} ${seed}`;
  const instituteCode = `PW${seed.slice(-6)}`;

  await page.goto("/admin/institutes");
  await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /add institute/i }).click();

  const createDialog = page.getByRole("dialog");
  await expect(createDialog.getByRole("heading", { name: /add institute/i })).toBeVisible();
  await createDialog.getByLabel(/institute name/i).fill(instituteName);
  await createDialog.getByLabel(/^code$/i).fill(instituteCode);
  await createDialog.getByLabel(/^email$/i).fill(`${instituteCode.toLowerCase()}@example.test`);
  await createDialog.getByLabel(/^phone$/i).fill(`91${seed.slice(-8)}`);
  await createDialog.getByLabel(/website/i).fill(`https://${instituteCode.toLowerCase()}.example.test`);
  await createDialog.getByLabel(/description/i).fill(`Browser onboarding profile flow for ${profileCode}.`);
  await createDialog.getByRole("combobox", { name: /onboarding profile/i }).selectOption(profileCode);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/institutes") &&
      response.request().method() === "POST",
  );
  await createDialog.getByRole("button", { name: /save institute/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), await createResponse.text()).toBe(true);

  const institute = (await createResponse.json()) as BrowserCreatedInstitute;
  await expect(page).toHaveURL(/\/admin\/academic-setup\?/);
  await expect(page).toHaveURL(new RegExp(`institute=${institute.id}`));

  return institute;
}

test.describe("Admin onboarding profiles", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingProfilesEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
      "admin onboarding profile browser coverage",
    ),
  );

  test("@workflow @mutable @onboarding admin can start a tracked blank institute onboarding flow from the browser", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    let instituteId: string | null = null;

    try {
      const institute = await createInstituteFromBrowser(page, "BLANK_INSTITUTE");
      instituteId = institute.id;
      expect(institute.onboarding_run_id).toBeTruthy();
      expect(institute.onboarding_run_status).toBe("pending");

      await onboardingPage.assertLoaded(institute.id);
      await expect(page.getByLabel(/onboarding profile/i)).toHaveValue("BLANK_INSTITUTE");
      await expect(
        page.getByText(/creates no academic or economy defaults\. use when the operator wants to onboard manually\./i),
      ).toBeVisible();
      await expect(page.getByLabel(/question-bank package access/i)).toHaveValue("disabled");
      await expect(page.getByLabel(/advanced builder access/i)).toHaveValue("disabled");

      expect(await countPrograms(page, institute.id)).toBe(0);
      expect(await countSubjects(page, institute.id)).toBe(0);
      expect(await countTopics(page, institute.id)).toBe(0);

      const runs = (await fetchInstituteOnboardingRuns(page, accessToken, institute.id)) as OnboardingRunRecord[];
      expect(runs).toHaveLength(1);
      expect(runs[0]?.profile_code).toBe("BLANK_INSTITUTE");
      expect(runs[0]?.status).toBe("pending");

      const runId = institute.onboarding_run_id!;
      const runDetail = (await fetchInstituteOnboardingRunDetail(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingRunDetailRecord;
      expect(runDetail.profile_code).toBe("BLANK_INSTITUTE");
      expect(runDetail.status).toBe("pending");
      expect(runDetail.source).toBe("institute_create");
      expect(runDetail.resolved_config_json?.profile_code).toBe("BLANK_INSTITUTE");

      const tasks = (await fetchInstituteOnboardingTasks(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingTaskRecord[];
      expect(tasks).toHaveLength(0);

      const questionEntitlements = await fetchQuestionEntitlements(page, accessToken);
      expect(questionEntitlements.some((row) => row.institute_code === institute.code)).toBe(false);
      const featureEntitlements = await fetchFeatureEntitlements(page, accessToken);
      expect(featureEntitlements.some((row) => row.institute_code === institute.code)).toBe(false);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable @onboarding admin can onboard a fresh institute with SCHOOL_STARTER from the browser", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    let instituteId: string | null = null;

    try {
      const institute = await createInstituteFromBrowser(page, "SCHOOL_STARTER");
      instituteId = institute.id;
      expect(institute.onboarding_run_id).toBeTruthy();

      await onboardingPage.assertLoaded(institute.id);
      await expect(page.getByLabel(/onboarding profile/i)).toHaveValue("SCHOOL_STARTER");
      await expect(page.getByLabel(/academic preset/i)).toHaveValue("class_7_cbse_core");
      await expect(page.getByLabel(/question-bank package access/i)).toHaveValue("disabled");
      await expect(page.getByLabel(/advanced builder access/i)).toHaveValue("disabled");

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok(), await applyResponse.text()).toBe(true);

      await onboardingPage.expectReadySummary(institute.name);
      expect(await countPrograms(page, institute.id)).toBeGreaterThanOrEqual(1);
      expect(await countSubjects(page, institute.id)).toBeGreaterThanOrEqual(5);
      expect(await countTopics(page, institute.id)).toBeGreaterThanOrEqual(90);

      const questionEntitlements = await fetchQuestionEntitlements(page, accessToken);
      expect(questionEntitlements.some((row) => row.institute_code === institute.code)).toBe(false);
      const featureEntitlements = await fetchFeatureEntitlements(page, accessToken);
      expect(featureEntitlements.some((row) => row.institute_code === institute.code)).toBe(false);

      const runId = institute.onboarding_run_id!;
      const runDetail = (await fetchInstituteOnboardingRunDetail(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingRunDetailRecord;
      expect(runDetail.profile_code).toBe("SCHOOL_STARTER");
      expect(runDetail.status).toBe("completed");

      const tasks = (await fetchInstituteOnboardingTasks(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingTaskRecord[];
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks.some((task) => task.task_code === "academic_preset_apply")).toBe(true);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable @onboarding admin can onboard a fresh institute with TRIAL_FULL_ACCESS from the browser", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    let instituteId: string | null = null;

    try {
      const institute = await createInstituteFromBrowser(page, "TRIAL_FULL_ACCESS");
      instituteId = institute.id;
      expect(institute.onboarding_run_id).toBeTruthy();

      await onboardingPage.assertLoaded(institute.id);
      await expect(page.getByLabel(/onboarding profile/i)).toHaveValue("TRIAL_FULL_ACCESS");
      await expect(page.getByLabel(/academic preset/i)).toHaveValue("class_7_cbse_core");
      await expect(page.getByLabel(/question-bank package access/i)).toHaveValue("disabled");
      await expect(page.getByLabel(/advanced builder access/i)).toHaveValue("enabled");

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok(), await applyResponse.text()).toBe(true);

      await onboardingPage.expectReadySummary(institute.name);
      expect(await countPrograms(page, institute.id)).toBeGreaterThanOrEqual(1);
      expect(await countSubjects(page, institute.id)).toBeGreaterThanOrEqual(5);
      expect(await countTopics(page, institute.id)).toBeGreaterThanOrEqual(90);

      const questionEntitlements = await fetchQuestionEntitlements(page, accessToken);
      expect(questionEntitlements.some((row) => row.institute_code === institute.code)).toBe(false);
      const featureEntitlements = await fetchFeatureEntitlements(page, accessToken);
      expect(
        featureEntitlements.some(
          (row) =>
            row.institute_code === institute.code &&
            row.feature_code === "ADVANCED_EXAM_BUILDER" &&
            row.status === "active",
        ),
      ).toBe(true);

      const runId = institute.onboarding_run_id!;
      const runDetail = (await fetchInstituteOnboardingRunDetail(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingRunDetailRecord;
      expect(runDetail.profile_code).toBe("TRIAL_FULL_ACCESS");
      expect(runDetail.status).toBe("completed");

      const tasks = (await fetchInstituteOnboardingTasks(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingTaskRecord[];
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks.some((task) => task.status === "completed")).toBe(true);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });
});
