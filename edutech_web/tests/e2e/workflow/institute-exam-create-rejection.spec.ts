import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import { expectInstituteWorkspace } from "../helpers/navigation";

const backendBaseUrl = resolveBackendBaseUrl();

function wizardTab(page: Page, name: RegExp) {
  return page.getByRole("tab", { name }).first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await locator.selectOption(options[0]!);
}

async function getAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

async function getInstituteIdFromSessionProfile(page: Page) {
  const encodedProfile =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_session_profile")?.value?.trim() ?? "";
  expect(encodedProfile).toBeTruthy();
  const profile = JSON.parse(decodeURIComponent(encodedProfile)) as { institute?: string | null };
  expect(profile.institute).toBeTruthy();
  return String(profile.institute);
}

async function deleteInstituteExam(page: Page, examId: string | null) {
  if (!examId) {
    return;
  }

  const accessToken = await getAccessToken(page);
  const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function seedDuplicateExam(page: Page, payload: {
  instituteId: string;
  academicYear: string;
  program: string;
  subject: string;
  title: string;
  code: string;
  examType: string;
  deliveryMode: string;
  timerMode: string;
  navigationMode: string;
  attemptPolicy: string;
  resultPublishMode: string;
  reviewMode: string;
  securityMode: string;
  rankVisibilityMode: string;
  percentileVisibilityMode: string;
  benchmarkVisibilityMode: string;
  rankFreezePolicy: string;
}) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: payload.instituteId,
      academic_year: payload.academicYear,
      program: payload.program,
      cohort: null,
      subject: payload.subject || null,
      source_type: "institute",
      title: payload.title,
      code: payload.code,
      description: "Disposable duplicate exam seed.",
      exam_type: payload.examType,
      delivery_mode: payload.deliveryMode,
      duration_minutes: 45,
      total_marks: "10",
      passing_marks: "4",
      start_at: null,
      end_at: null,
      instructions: "Disposable duplicate exam seed.",
      allow_late_submit: false,
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: false,
      allow_review_after_submit: true,
      max_attempts: 1,
      timer_mode: payload.timerMode,
      navigation_mode: payload.navigationMode,
      attempt_policy: payload.attemptPolicy,
      result_publish_mode: payload.resultPublishMode,
      review_mode: payload.reviewMode,
      security_mode: payload.securityMode,
      rank_visibility_mode: payload.rankVisibilityMode,
      percentile_visibility_mode: payload.percentileVisibilityMode,
      benchmark_visibility_mode: payload.benchmarkVisibilityMode,
      rank_freeze_policy: payload.rankFreezePolicy,
      allow_resume: true,
      allow_section_switching: true,
      allow_return_to_previous_section: true,
      result_publish_at: null,
      review_available_from: null,
      review_available_until: null,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { id: string };
}

test.describe("Institute exam create rejection", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute sees truthful recovery when create exam shell is rejected", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Institute Reject ${uniqueSeed}`;
    const duplicateTitle = `${examTitle} Existing`;
    const examCode = `PW-IRJ-${uniqueSeed}`;
    let seededExamId: string | null = null;

    try {
      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const instituteId = await getInstituteIdFromSessionProfile(page);
      const academicYear = page.locator('select[name="academic_year"]').first();
      const program = page.locator('select[name="program"]').first();
      const subject = page.locator('select[name="subject"]').first();

      if ((await academicYear.inputValue()) === "") {
        await selectFirstNonEmptyOption(academicYear);
      }
      if ((await program.inputValue()) === "") {
        await selectFirstNonEmptyOption(program);
      }

      const academicYearValue = await academicYear.inputValue();
      const programValue = await program.inputValue();
      let subjectValue = "";
      if ((await subject.inputValue()) === "") {
        const subjectOptions = await subject.locator("option").evaluateAll((nodes) =>
          nodes
            .map((node) => (node as HTMLOptionElement).value)
            .filter((value) => value.trim().length > 0),
        );
        if (subjectOptions[0]) {
          await subject.selectOption(subjectOptions[0]);
        }
      }
      subjectValue = await subject.inputValue();
      const examTypeValue = await page.locator('select[name="exam_type"]').inputValue();
      const deliveryModeValue = await page.locator('select[name="delivery_mode"]').inputValue();
      const timerModeValue = await page.locator('select[name="timer_mode"]').inputValue();
      const navigationModeValue = await page.locator('select[name="navigation_mode"]').inputValue();
      const attemptPolicyValue = await page.locator('select[name="attempt_policy"]').inputValue();
      const resultPublishModeValue = await page.locator('select[name="result_publish_mode"]').inputValue();
      const reviewModeValue = await page.locator('select[name="review_mode"]').inputValue();
      const securityModeValue = await page.locator('select[name="security_mode"]').inputValue();
      const rankVisibilityModeValue = await page.locator('select[name="rank_visibility_mode"]').inputValue();
      const percentileVisibilityModeValue = await page.locator('select[name="percentile_visibility_mode"]').inputValue();
      const benchmarkVisibilityModeValue = await page.locator('select[name="benchmark_visibility_mode"]').inputValue();
      const rankFreezePolicyValue = await page.locator('select[name="rank_freeze_policy"]').inputValue();

      const seededExam = await seedDuplicateExam(page, {
        instituteId,
        academicYear: academicYearValue,
        program: programValue,
        subject: subjectValue,
        title: duplicateTitle,
        code: examCode,
        examType: examTypeValue,
        deliveryMode: deliveryModeValue,
        timerMode: timerModeValue,
        navigationMode: navigationModeValue,
        attemptPolicy: attemptPolicyValue,
        resultPublishMode: resultPublishModeValue,
        reviewMode: reviewModeValue,
        securityMode: securityModeValue,
        rankVisibilityMode: rankVisibilityModeValue,
        percentileVisibilityMode: percentileVisibilityModeValue,
        benchmarkVisibilityMode: benchmarkVisibilityModeValue,
        rankFreezePolicy: rankFreezePolicyValue,
      });
      seededExamId = seededExam.id;

      await page.locator('input[name="title"]').fill(examTitle);
      await page.locator('input[name="code"]').fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /schedule and delivery/i)).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /runtime rules/i)).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /learner experience/i)).toHaveAttribute("aria-selected", "true");

      await page.getByRole("button", { name: /create exam shell/i }).click();

      await expect(page).toHaveURL(/\/institute\/exams\/new\?error=/);
      await expect(page.locator(".feedbackBannerError").first()).toContainText(
        /the fields institute, code must make a unique set\./i,
      );
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await expect(wizardTab(page, /scope and identity/i)).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /create exam shell/i })).toHaveCount(0);
      await expect(page.locator('input[name="title"]')).toHaveValue("");
      await expect(page.locator('input[name="code"]')).toHaveValue("");
    } finally {
      await deleteInstituteExam(page, seededExamId);
    }
  });
});
