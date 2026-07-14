import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  countPrograms,
  countSubjects,
  countTopics,
  createDisposableInstitute,
  deleteDisposableInstitute,
  fetchInstituteOnboardingRunDetail,
  fetchInstituteOnboardingRuns,
  fetchInstituteOnboardingTasks,
  getAdminAccessToken,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";
import { AdminInstituteOnboardingPage } from "../page-objects/admin/admin-institute-onboarding.po";

const mutableAdminOnboardingRecoveryEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);

type BrowserCreatedInstitute = {
  id: string;
  name: string;
  code: string;
  onboarding_run_id: string | null;
};

type OnboardingRunRecord = {
  id: string;
  profile_code?: string;
  status?: string;
};

type OnboardingRunDetailRecord = {
  profile_code?: string;
  status?: string;
};

type OnboardingTaskRecord = {
  status?: string;
};

async function createInstituteFromBrowser(
  page: Page,
  profileCode: "SCHOOL_STARTER" | "TRIAL_FULL_ACCESS",
) {
  const seed = uniqueOnboardingSeed();
  const instituteName = `PW ${profileCode} Recovery ${seed}`;
  const instituteCode = `PWRC${seed.slice(-5)}`;

  await page.goto("/admin/institutes");
  await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /add institute/i }).click();

  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel(/institute name/i).fill(instituteName);
  await createDialog.getByLabel(/^code$/i).fill(instituteCode);
  await createDialog.getByLabel(/^email$/i).fill(`${instituteCode.toLowerCase()}@example.test`);
  await createDialog.getByLabel(/^phone$/i).fill(`91${seed.slice(-8)}`);
  await createDialog.getByLabel(/website/i).fill(`https://${instituteCode.toLowerCase()}.example.test`);
  await createDialog.getByLabel(/description/i).fill(`Recovery coverage for ${profileCode}.`);
  await createDialog.getByRole("combobox", { name: /onboarding profile/i }).selectOption(profileCode);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/institutes") &&
      response.request().method() === "POST",
  );
  await createDialog.getByRole("button", { name: /save institute/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), await createResponse.text()).toBe(true);

  return (await createResponse.json()) as BrowserCreatedInstitute;
}

test.describe("Admin onboarding recovery", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingRecoveryEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
      "admin onboarding recovery browser coverage",
    ),
  );

  test("@workflow @mutable @onboarding completed onboarding run is visible in institute history with task details", async ({
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

      await onboardingPage.assertLoaded(institute.id);
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok(), await applyResponse.text()).toBe(true);
      await onboardingPage.expectReadySummary(institute.name);

      await page.goto(`/admin/institutes?institute=${institute.id}`);
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
      await expect(page.getByText(/latest onboarding state/i).first()).toBeVisible();
      await expect(page.getByText(/school starter/i).first()).toBeVisible();
      await expect(page.getByText(/run status/i).first()).toBeVisible();
      await expect(page.locator(".adminInstituteRunCard").first().getByText(/^completed$/i)).toBeVisible();
      await expect(page.getByText(/onboarding history/i).first()).toBeVisible();
      await expect(page.locator(".adminInstituteRunCard")).toHaveCount(1);

      const runCard = page.locator(".adminInstituteRunCard").first();
      await expect(runCard.getByText(/school starter/i).first()).toBeVisible();
      await expect(runCard.getByRole("button", { name: /view task details/i })).toBeVisible();
      await runCard.getByRole("button", { name: /view task details/i }).click();
      await expect(runCard.getByText(/loading task details\.\.\.|task execution record/i).first()).toBeVisible();
      await expect(runCard.getByText(/result:/i).first()).toBeVisible();
      await expect(runCard.getByText(/view result payload/i).first()).toBeVisible();
      await runCard.getByText(/view result payload/i).first().click();
      await expect(runCard.locator("pre.adminInstituteTaskResultPre").first()).toBeVisible();

      const runs = (await fetchInstituteOnboardingRuns(page, accessToken, institute.id)) as OnboardingRunRecord[];
      expect(runs).toHaveLength(1);
      expect(runs[0]?.status).toBe("completed");
      expect(runs[0]?.profile_code).toBe("SCHOOL_STARTER");

      const runId = institute.onboarding_run_id!;
      const runDetail = (await fetchInstituteOnboardingRunDetail(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingRunDetailRecord;
      expect(runDetail.status).toBe("completed");
      expect(runDetail.profile_code).toBe("SCHOOL_STARTER");

      const tasks = (await fetchInstituteOnboardingTasks(
        page,
        accessToken,
        institute.id,
        runId,
      )) as OnboardingTaskRecord[];
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.some((task) => task.status === "completed")).toBe(true);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable @onboarding reapply creates a second tracked run without duplicating academic structure", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createDisposableInstitute(page, {
        name: `PW Recovery Reapply ${seed}`,
        code: `PWRR${seed.slice(-5)}`,
      });
      instituteId = institute.id;

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2040-2041 Recovery ${seed}`);
      await onboardingPage.selectOnboardingProfile("SCHOOL_STARTER");
      await onboardingPage.selectApplyMode("full");
      const firstApplyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.previewThenApply();
      const firstApplyResponse = await firstApplyResponsePromise;
      expect(firstApplyResponse.ok(), await firstApplyResponse.text()).toBe(true);
      await onboardingPage.expectReadySummary(institute.name);

      const initialProgramCount = await countPrograms(page, institute.id);
      const initialSubjectCount = await countSubjects(page, institute.id);
      const initialTopicCount = await countTopics(page, institute.id);

      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.setAcademicYear(`2040-2041 Recovery ${seed}`);
      await onboardingPage.selectOnboardingProfile("TRIAL_FULL_ACCESS");
      await onboardingPage.setAdvancedBuilderAccess("enabled");
      await onboardingPage.setQuestionBankAccess("disabled");
      const secondApplyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await onboardingPage.applyPreset();
      const secondApplyResponse = await secondApplyResponsePromise;
      expect(secondApplyResponse.ok(), await secondApplyResponse.text()).toBe(true);
      await onboardingPage.expectReadySummary(institute.name);

      await expect.poll(async () => countPrograms(page, institute.id)).toBe(initialProgramCount);
      await expect.poll(async () => countSubjects(page, institute.id)).toBe(initialSubjectCount);
      await expect.poll(async () => countTopics(page, institute.id)).toBe(initialTopicCount);

      await page.goto(`/admin/institutes?institute=${institute.id}`);
      await expect(page.locator(".adminInstituteRunCard")).toHaveCount(2);
      await expect(page.locator(".adminInstituteRunCard").nth(0).getByText(/trial full access|school starter/i).first()).toBeVisible();
      await expect(page.locator(".adminInstituteRunCard").nth(1).getByText(/trial full access|school starter/i).first()).toBeVisible();

      const runs = (await fetchInstituteOnboardingRuns(page, accessToken, institute.id)) as OnboardingRunRecord[];
      expect(runs).toHaveLength(2);
      expect(runs.every((run) => run.status === "completed")).toBe(true);
      expect(new Set(runs.map((run) => run.id)).size).toBe(2);

      const latestRunId = runs[0]!.id;
      const latestTasks = (await fetchInstituteOnboardingTasks(
        page,
        accessToken,
        institute.id,
        latestRunId,
      )) as OnboardingTaskRecord[];
      expect(latestTasks.length).toBeGreaterThan(0);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });
});
