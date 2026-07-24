import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { answerCurrentAttemptQuestion, ensureToggleChecked } from "../helpers/attempt";
import { assignStudentToExam, resolveStudentAttemptTarget, scheduleAndPublishExam } from "../helpers/family-runtime";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

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

type LookupInstituteRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupAcademicYearRecord = {
  id: string;
  name: string;
};

type LookupProgramRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupSubjectRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupTopicRecord = {
  id: string;
  code: string;
  name: string;
};

type LookupCohortRecord = {
  id: string;
  code: string;
  name: string;
};

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

function desktopSnapshotMasks(page: Page) {
  return [
    page.locator(".attemptWorkspaceHeader").first(),
    page.locator(".attemptConsoleTimerWrap").first(),
    page.locator(".attemptConsoleSummaryGrid").first(),
    page.locator(".attemptSubmitChecklist").first(),
    page.locator(".attemptPaletteLegend").first(),
    page.locator(".attemptQuestionNavChipMeta").first(),
    page.locator(".attemptQuestionHeader").first(),
    page.locator(".attemptQuestionPrompt").first(),
    page.locator(".attemptOptionList").first(),
    page.locator(".attemptQuestionMetaLine").first(),
    page.locator(".attemptTextarea").first(),
    page.locator(".attemptTranscriptTextarea").first(),
    page.locator(".attemptArtifactRow").first(),
    page.locator(".attemptActions").first(),
    page.locator(".attemptQuestionStateStrip").first(),
    page.locator(".attemptSupportText").first(),
    page.locator(".attemptResponseWorkflow").first(),
    page.locator(".attemptQuestionFooter").first(),
    page.locator(".attemptDraftNotice").first(),
    page.locator(".attemptForm").first(),
    page.locator(".attemptReviewToggle").first(),
  ];
}

async function moveToObjectiveQuestionForVisual(page: Page, maxHops = 8) {
  for (let hop = 0; hop < maxHops; hop += 1) {
    if (await page.locator(".attemptOptionList").first().isVisible().catch(() => false)) {
      return;
    }

    const nextButton = page.getByRole("link", { name: /^next$/i }).first();
    if (!(await nextButton.isVisible().catch(() => false))) {
      return;
    }

    await nextButton.click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }
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
    method?: "GET" | "POST" | "PATCH" | "DELETE";
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
      : options?.method === "PATCH"
        ? await page.request.patch(url, {
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

  const academicYear = academicYears.results.find((year) => year.name.trim() === "2026-2027") ?? academicYears.results[0];
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

  const uniqueSubjectIds = new Set<string>();
  const scopes: BlueprintScope[] = [];
  for (const subject of orderedSubjects) {
    if (uniqueSubjectIds.has(subject.id)) {
      continue;
    }
    uniqueSubjectIds.add(subject.id);
    const topics = await requestBackendJson<{ results: LookupTopicRecord[] }>(
      page,
      accessToken,
      `/api/v1/academics/topics/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subject.id)}`,
    );
    if (topics.results.length === 0) {
      continue;
    }
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
      description: `Playwright visual student runtime for ${scope.subject.name}`,
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
          topics: distributeTopicCounts(
            totalQuestions,
            scope.topics.map((topic) => topic.code),
          ),
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
  const previewFailures: string[] = [];

  for (const scope of scopes) {
    const examTitle = `PW Student Visual ${scope.subject.name} ${uniqueSeed}`;
    const examCode = `PW-SV-${scope.subject.code}-${uniqueSeed}`.slice(0, 40);
    const payload = buildExamPayload(scope, examTitle, examCode, totalQuestions);

    const previewResponse = await page.request.post(`${backendBaseUrl}/api/v1/exams/advanced-builder/preview/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: payload,
      timeout: 30000,
    });
    if (!previewResponse.ok()) {
      previewFailures.push(`${scope.subject.name}: ${await previewResponse.text()}`);
      continue;
    }

    const previewPayload = (await previewResponse.json()) as PreviewPayload;
    if (!previewPayload.valid) {
      previewFailures.push(
        `${scope.subject.name}: ${(previewPayload.errors?.composition ?? previewPayload.errors?.scope ?? previewPayload.errors?.exam ?? ["preview invalid"]).join(" | ")}`,
      );
      continue;
    }

    const created = await requestBackendJson<{ data: { id: string } }>(
      page,
      accessToken,
      "/api/v1/exams/advanced-builder/create/",
      {
        method: "POST",
        data: payload,
      },
    );

    return {
      examId: created.data.id,
      examTitle,
    };
  }

  throw new Error(`Could not create a valid 45-question Class 7 visual exam. ${previewFailures.join(" || ")}`);
}

async function deleteExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  await requestBackendJson(page, accessToken, `/api/v1/exams/${examId}/`, {
    method: "DELETE",
  });
}

async function applyStudentAccommodationProfile(
  page: Page,
  accessToken: string,
  studentProfileId: string,
) {
  await requestBackendJson(page, accessToken, `/api/v1/students/${studentProfileId}/`, {
    method: "PATCH",
    data: {
      accommodation_profile: {
        extra_time_minutes: 10,
        additional_violation_allowance: 0,
        simplified_warning_copy: false,
        alternative_instructions:
          "Use the standard exam instructions together with this approved support plan.",
        notes: "Needs extra review time.",
      },
    },
  });
}

test.describe("Student attempt visual journey", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are required.");

  test("@workflow @visual student attempt workspace stays focused during a live 45-question exam", async ({
    page,
  }, testInfo) => {
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
      await applyStudentAccommodationProfile(page, adminAccessToken, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);

      await loginWithCredentials(page, opbmsStudentCredentials, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: /^start$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/, { timeout: 30000 });
      await expect(page.locator(".attemptQuestionCard").first()).toBeVisible();
      await moveToObjectiveQuestionForVisual(page);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Student visual runtime");
      await ensureToggleChecked(page.getByRole("checkbox", { name: /mark for review/i }).first());

      await expect(page.locator(".attemptQuestionHeader").first()).toHaveScreenshot(
        "student-attempt-question-header.png",
        {
          animations: "disabled",
          caret: "hide",
          mask: desktopSnapshotMasks(page),
        },
      );
      await expect(page.locator(".attemptLiveCheckpoint").first()).toHaveScreenshot(
        "student-attempt-live-checkpoint.png",
        {
          animations: "disabled",
          caret: "hide",
          mask: desktopSnapshotMasks(page),
        },
      );
      await expect(page.locator(".attemptConsoleRail").first()).toHaveScreenshot(
        "student-attempt-rail.png",
        {
          animations: "disabled",
          caret: "hide",
          mask: [
            page.locator(".attemptConsoleTimerWrap").first(),
            page.locator(".attemptSubmitChecklist").first(),
          ],
        },
      );

      const fullShot = testInfo.outputPath("student-attempt-visual-overview.png");
      await page.locator("main").screenshot({ path: fullShot });
      await testInfo.attach("student-attempt-visual-overview", {
        path: fullShot,
        contentType: "image/png",
      });

      const questionHeaderShot = testInfo.outputPath("student-attempt-visual-question-header.png");
      await page.locator(".attemptQuestionHeader").first().screenshot({ path: questionHeaderShot });
      await testInfo.attach("student-attempt-visual-question-header", {
        path: questionHeaderShot,
        contentType: "image/png",
      });

      const checkpointShot = testInfo.outputPath("student-attempt-visual-live-checkpoint.png");
      await page.locator(".attemptLiveCheckpoint").first().screenshot({ path: checkpointShot });
      await testInfo.attach("student-attempt-visual-live-checkpoint", {
        path: checkpointShot,
        contentType: "image/png",
      });

      const railShot = testInfo.outputPath("student-attempt-visual-rail.png");
      await page.locator(".attemptConsoleRail").first().screenshot({ path: railShot });
      await testInfo.attach("student-attempt-visual-rail", {
        path: railShot,
        contentType: "image/png",
      });
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteExamDirectly(page, examId);
      }
    }
  });
});
