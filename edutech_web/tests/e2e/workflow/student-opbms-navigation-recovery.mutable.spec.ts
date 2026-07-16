import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { assignStudentToExam, resolveStudentAttemptTarget, scheduleAndPublishExam } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const opbmsStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_STUDENT_USERNAME?.trim() || "a001",
  password: process.env.PLAYWRIGHT_OPBMS_STUDENT_PASSWORD?.trim() || "Ansh@1789",
};

type LoginEnvelope = {
  access?: string;
  user?: {
    institute?: string | null;
  };
};

type LookupInstituteRecord = { id: string; code: string; name: string };
type LookupAcademicYearRecord = { id: string; name: string };
type LookupProgramRecord = { id: string; code: string; name: string };
type LookupSubjectRecord = { id: string; code: string; name: string };
type LookupTopicRecord = { id: string; code: string; name: string };
type LookupCohortRecord = { id: string; code: string; name: string };
type PreviewPayload = {
  valid?: boolean;
  errors?: {
    composition?: string[];
    scope?: string[];
    exam?: string[];
  };
};

type BlueprintScope = {
  institute: LookupInstituteRecord;
  academicYear: LookupAcademicYearRecord;
  program: LookupProgramRecord;
  subject: LookupSubjectRecord;
  cohort: LookupCohortRecord | null;
  topics: LookupTopicRecord[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function requestBackendJson<T>(
  page: Page,
  accessToken: string,
  path: string,
  options?: {
    method?: "GET" | "POST" | "DELETE";
    data?: Record<string, unknown>;
  },
) {
  const url = `${backendBaseUrl}${path}`;
  const response =
    options?.method === "POST"
      ? await page.request.post(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          data: options.data,
          timeout: 20000,
        })
      : options?.method === "DELETE"
        ? await page.request.delete(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 20000,
          })
        : await page.request.get(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 20000,
          });

  expect(response.ok(), await response.text()).toBe(true);
  if (options?.method === "DELETE") {
    return null as T;
  }
  return (await response.json()) as T;
}

async function resolveStudentInstituteId(page: Page, credentials: DirectLoginCredentials) {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
    data: credentials,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const envelope = (await response.json()) as LoginEnvelope;
  const instituteId = envelope.user?.institute?.trim() ?? "";
  expect(instituteId).not.toBe("");
  return instituteId;
}

function distributeTopicCounts(totalQuestions: number, topicCodes: string[]) {
  const usableTopics = topicCodes.slice(0, Math.min(topicCodes.length, 9));
  expect(usableTopics.length).toBeGreaterThan(0);
  const base = Math.floor(totalQuestions / usableTopics.length);
  let remainder = totalQuestions % usableTopics.length;
  return usableTopics.map((topicCode) => {
    const count = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return {
      topic_code: topicCode,
      count,
    };
  });
}

async function resolveCandidateScopes(page: Page, accessToken: string, instituteId: string) {
  const institute = await requestBackendJson<LookupInstituteRecord>(
    page,
    accessToken,
    `/api/v1/institutes/${instituteId}/`,
  );
  const academicYears = await requestBackendJson<{ results: LookupAcademicYearRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/academic-years/?is_active=true&institute=${encodeURIComponent(instituteId)}`,
  );
  const programs = await requestBackendJson<{ results: LookupProgramRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/programs/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}`,
  );
  const class7Program =
    programs.results.find((program) => program.name.trim().toLowerCase() === "class 7") ?? null;
  expect(class7Program).toBeTruthy();

  const academicYear =
    academicYears.results.find((year) => year.name.trim() === "2026-2027") ?? academicYears.results[0];
  expect(academicYear).toBeTruthy();

  const subjects = await requestBackendJson<{ results: LookupSubjectRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/subjects/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}&program=${encodeURIComponent(class7Program!.id)}`,
  );
  const cohorts = await requestBackendJson<{ results: LookupCohortRecord[] }>(
    page,
    accessToken,
    `/api/v1/academics/cohorts/?is_active=true&institute=${encodeURIComponent(instituteId)}&academic_year=${encodeURIComponent(academicYear!.id)}&program=${encodeURIComponent(class7Program!.id)}`,
  );

  const preferredSubjectMatchers = [/^math$/i, /^mathematics$/i, /^science$/i];
  const orderedSubjects = [
    ...preferredSubjectMatchers.flatMap((matcher) => subjects.results.filter((subject) => matcher.test(subject.name.trim()))),
    ...subjects.results.filter(
      (subject) => !preferredSubjectMatchers.some((matcher) => matcher.test(subject.name.trim())),
    ),
  ];

  const scopes: BlueprintScope[] = [];
  const uniqueSubjectIds = new Set<string>();
  for (const subject of orderedSubjects) {
    if (uniqueSubjectIds.has(subject.id)) continue;
    uniqueSubjectIds.add(subject.id);
    const topics = await requestBackendJson<{ results: LookupTopicRecord[] }>(
      page,
      accessToken,
      `/api/v1/academics/topics/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subject.id)}`,
    );
    if (!topics.results.length) continue;
    scopes.push({
      institute,
      academicYear: academicYear!,
      program: class7Program!,
      subject,
      cohort: cohorts.results[0] ?? null,
      topics: topics.results,
    });
  }

  expect(scopes.length).toBeGreaterThan(0);
  return scopes;
}

function buildExamPayload(scope: BlueprintScope, examTitle: string, examCode: string, totalQuestions: number) {
  return {
    scope: {
      institute_code: scope.institute.code,
      academic_year_name: scope.academicYear.name,
      program_code: scope.program.code,
      cohort_code: scope.cohort?.code ?? "",
      subject_code: scope.subject.code,
    },
    exam: {
      title: examTitle,
      code: examCode,
      description: `Playwright student navigation and recovery check for ${scope.subject.name}`,
      preset_pack_code: "",
      exam_type: "test",
      delivery_mode: "online",
      status: "draft",
      duration_minutes: 60,
      passing_marks: "0.00",
      instructions: "Answer carefully and save before moving ahead.",
    },
    composition: {
      selection_mode: "subject_fallback",
      sections: [
        {
          name: `${scope.subject.name} Section`,
          order: 1,
          question_count: totalQuestions,
          marks_per_question: "1.00",
          negative_marks_per_question: "0.00",
          difficulty_mix: {
            foundation: 100,
            intermediate: 0,
            advanced: 0,
          },
          topics: distributeTopicCounts(totalQuestions, scope.topics.map((topic) => topic.code)),
        },
      ],
    },
    delivery: {
      timer_mode: "global",
      navigation_mode: "free_exam",
      attempt_policy: "single",
      max_attempts: 1,
      result_publish_mode: "after_review",
      review_mode: "attempted_only",
      security_mode: "normal",
      assignment_mode: "selected_students",
      randomize_questions: true,
      randomize_options: true,
    },
    economy: {
      policy_type: "",
      star_cost: 0,
      entitlement_code: "",
      priority: 100,
      unlock_rule: {
        rule_type: "",
        required_star_balance: null,
        required_entitlement_code: "",
        required_completion_count: null,
        required_score_percentage: null,
        priority: 100,
        admin_override_allowed: true,
      },
    },
  };
}

async function createPreviewedClass7ExamForStudentInstitute(
  page: Page,
  accessToken: string,
  instituteId: string,
  uniqueSeed: number,
  totalQuestions: number,
) {
  const scopes = await resolveCandidateScopes(page, accessToken, instituteId);
  for (const scope of scopes) {
    const examTitle = `PW Student Recovery ${scope.subject.name} ${uniqueSeed}`;
    const examCode = `PW-SR-${scope.subject.code}-${uniqueSeed}`.slice(0, 40);
    const payload = buildExamPayload(scope, examTitle, examCode, totalQuestions);

    const previewResponse = await page.request.post(`${backendBaseUrl}/api/v1/exams/advanced-builder/preview/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: payload,
      timeout: 30000,
    });
    expect(previewResponse.ok(), await previewResponse.text()).toBe(true);
    const previewPayload = (await previewResponse.json()) as PreviewPayload;
    if (!previewPayload.valid) continue;

    const created = await requestBackendJson<{ data: { id: string } }>(
      page,
      accessToken,
      "/api/v1/exams/advanced-builder/create/",
      { method: "POST", data: payload },
    );

    return {
      examId: created.data.id,
      examTitle,
    };
  }

  throw new Error("Could not create a valid 45-question Class 7 exam for navigation and recovery coverage.");
}

async function deleteExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  await requestBackendJson(page, accessToken, `/api/v1/exams/${examId}/`, {
    method: "DELETE",
  });
}

async function expectSavedCount(page: Page, count: string) {
  const savedTile = page.locator(".attemptConsoleSummaryCard .attemptStatusTileSaved").first();
  await expect(savedTile).toBeVisible();
  await expect(savedTile.locator("strong")).toHaveText(count);
}

test.describe("Student OPBMS navigation and recovery", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are required.");

  test.skip(
    !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "student OPBMS navigation and recovery coverage",
    ),
  );

  test("@workflow @mutable student a001 can navigate jump reload resume and submit a published 45-question exam", async ({
    page,
  }) => {
    test.setTimeout(300000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const totalQuestions = 45;
    const studentTarget = await resolveStudentAttemptTarget(page, opbmsStudentCredentials);
    const studentInstituteId = await resolveStudentInstituteId(page, opbmsStudentCredentials);

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      const adminAccessToken = await backendAccessToken(page);
      const created = await createPreviewedClass7ExamForStudentInstitute(
        page,
        adminAccessToken,
        studentInstituteId,
        uniqueSeed,
        totalQuestions,
      );
      examId = created.examId;

      await assignStudentToExam(page, examId, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);

      await loginWithCredentials(page, opbmsStudentCredentials, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: /^start$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/, { timeout: 30000 });
      const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();

      await answerCurrentAttemptQuestion(page, uniqueSeed, "OPBMS navigation recovery");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(
        page.getByText(/response updated successfully|responses saved/i).first(),
      ).toBeVisible();
      await expectSavedCount(page, "1");

      await page.getByRole("link", { name: /^next$/i }).click();
      await expect(page.getByText(/2 of 45/i).first()).toBeVisible();

      await page.getByRole("link", { name: /^previous$/i }).click();
      await expect(page.getByText(/1 of 45/i).first()).toBeVisible();

      const thirdQuestionChip = page
        .locator(".attemptQuestionNavChip")
        .filter({ has: page.locator("strong", { hasText: /^3$/ }) })
        .first();
      await expect(thirdQuestionChip).toBeVisible();
      await thirdQuestionChip.click();
      await expect(page.getByText(/3 of 45/i).first()).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.getByText(/Question Palette/i).first()).toBeVisible();
      await expectSavedCount(page, "1");
      await expect(page.locator(".attemptConsoleSummaryCard").first()).toContainText(
        /Latest confirmed save|Last confirmed save/i,
      );

      await page.goto(`/app/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /^resume$/i }).first()).toBeVisible();
      await expect(page.getByText(/active attempt already exists/i).first()).toBeVisible();
      await page.getByRole("link", { name: /^resume$/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));

      await page.getByRole("checkbox", { name: /mark for review/i }).check();
      await page.getByRole("button", { name: /^save & next$/i }).click();
      await expect(
        page
          .locator(".feedbackBannerSuccess")
          .filter({
            hasText:
              /response updated successfully|answer saved\. moving to the next question|answer saved\. you have reached the final question/i,
          })
          .first(),
      ).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();

      await expect(page).toHaveURL(
        /\/app\/attempts\/[^/?#]+(?:\/summary|\?question=[^#]+)(?:\?.*)?$/,
        { timeout: 30000 },
      );
      await expect(page.getByText(/submitted|attempt auto-submitted/i).first()).toBeVisible();
      await expect(page.getByText(/post-submit state|summary/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteExamDirectly(page, examId);
      }
    }
  });
});
