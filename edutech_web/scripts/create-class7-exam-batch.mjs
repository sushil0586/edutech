import { chromium } from "@playwright/test";

const frontendBaseUrl = process.env.BATCH_FRONTEND_BASE_URL ?? "http://localhost:3000";
const backendBaseUrl = process.env.BATCH_BACKEND_BASE_URL ?? "http://127.0.0.1:9001";
const credentials = {
  username: process.env.BATCH_INSTITUTE_USERNAME ?? "obpms",
  password: process.env.BATCH_INSTITUTE_PASSWORD ?? "Demo@12345",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectOkJson(response, label) {
  if (!response.ok()) {
    const text = await response.text().catch(() => "");
    throw new Error(`${label} failed with ${response.status()}: ${text}`);
  }
  return response.json();
}

function createProfileSnapshot(user) {
  return encodeURIComponent(
    JSON.stringify({
      id: String(user.id ?? ""),
      username: String(user.username ?? ""),
      display_name: String(user.display_name ?? user.username ?? ""),
      role: String(user.role ?? ""),
      institute: user.institute == null ? null : String(user.institute),
      institute_name: user.institute_name == null ? null : String(user.institute_name),
      student_profile: user.student_profile == null ? null : String(user.student_profile),
      teacher_profile: user.teacher_profile == null ? null : String(user.teacher_profile),
      onboarding_status: user.onboarding_status == null ? undefined : String(user.onboarding_status),
      profile_completion_required: Boolean(user.profile_completion_required),
      onboarding_role: user.onboarding_role == null ? undefined : String(user.onboarding_role),
      is_active: Boolean(user.is_active ?? true),
    }),
  );
}

function section({
  name,
  order,
  subjectCode,
  questionCount,
  marksPerQuestion = "1.00",
  negativeMarksPerQuestion = "0.00",
  difficultyMix,
  topics,
  timerEnabled = false,
  durationMinutes = null,
}) {
  return {
    name,
    order,
    subject_code: subjectCode,
    question_count: questionCount,
    marks_per_question: marksPerQuestion,
    negative_marks_per_question: negativeMarksPerQuestion,
    difficulty_mix: difficultyMix,
    timer_enabled: timerEnabled,
    duration_minutes: durationMinutes,
    topics: topics.map(([topicCode, count]) => ({
      topic_code: topicCode,
      count,
    })),
  };
}

function buildPayload({
  instituteCode,
  academicYearName,
  programCode,
  primarySubjectCode = "",
  scenario,
}) {
  return {
    scope: {
      institute_code: instituteCode,
      academic_year_name: academicYearName,
      program_code: programCode,
      cohort_code: "",
      subject_code: primarySubjectCode,
    },
    exam: {
      title: scenario.title,
      code: scenario.code,
      description: scenario.description,
      exam_type: scenario.examType,
      delivery_mode: "online",
      status: "draft",
      duration_minutes: scenario.durationMinutes,
      instructions: scenario.instructions,
      source_type: "institute",
    },
    composition: {
      selection_mode: scenario.selectionMode,
      sections: scenario.sections,
    },
    delivery: {
      timer_mode: "global",
      navigation_mode: "free_exam",
      attempt_policy: scenario.examType === "practice" ? "unlimited_practice" : "single",
      max_attempts: scenario.examType === "practice" ? 1 : 1,
      result_publish_mode: scenario.examType === "practice" ? "immediate" : "after_review",
      review_mode: scenario.examType === "practice" ? "solution_review" : "attempted_only",
      security_mode: "normal",
      assignment_mode: "scope",
      randomize_questions: true,
      randomize_options: true,
    },
    economy: {
      policy_type: "free",
      star_cost: 0,
      entitlement_code: "",
      priority: 10,
    },
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: frontendBaseUrl });
  const page = await context.newPage();

  const loginResponse = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
    data: credentials,
    timeout: 15000,
  });
  const loginPayload = await expectOkJson(loginResponse, "Login");

  await context.addCookies([
    {
      name: "nexora_access_token",
      value: loginPayload.access,
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
    {
      name: "nexora_refresh_token",
      value: loginPayload.refresh,
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
    {
      name: "nexora_session_profile",
      value: createProfileSnapshot(loginPayload.user),
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  const authHeader = {
    Authorization: `Bearer ${loginPayload.access}`,
    "Content-Type": "application/json",
  };

  const meResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: authHeader,
  });
  const me = await expectOkJson(meResponse, "Auth profile");
  const instituteId = String(me.institute ?? "");
  if (!instituteId) {
    throw new Error("Institute scope is missing on the login profile.");
  }

  const academicYearsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/academic-years/?is_active=true&institute=${encodeURIComponent(instituteId)}`,
    { headers: authHeader },
  );
  const academicYearsPayload = await expectOkJson(academicYearsResponse, "Academic years");
  const academicYears = Array.isArray(academicYearsPayload.results) ? academicYearsPayload.results : [];
  const selectedAcademicYear =
    academicYears.find((entry) => entry.is_current) ?? academicYears[0] ?? null;
  if (!selectedAcademicYear) {
    throw new Error("No active academic year was found for OBPMS.");
  }

  const programsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/programs/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}`,
    { headers: authHeader },
  );
  const programsPayload = await expectOkJson(programsResponse, "Programs");
  const program = programsPayload.results.find((entry) => entry.name === "Class 7");
  if (!program) {
    throw new Error('Program "Class 7" was not found.');
  }

  const subjectsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/subjects/?is_active=true&page_size=500&program=${encodeURIComponent(program.id)}&institute=${encodeURIComponent(instituteId)}`,
    { headers: authHeader },
  );
  const subjectsPayload = await expectOkJson(subjectsResponse, "Subjects");
  const subjectByName = new Map(subjectsPayload.results.map((entry) => [entry.name, entry]));
  const math = subjectByName.get("Math");
  const science = subjectByName.get("Science");
  if (!math || !science) {
    throw new Error("Class 7 Math/Science subjects were not found.");
  }

  async function fetchTopics(subject) {
    const response = await page.request.get(
      `${backendBaseUrl}/api/v1/academics/topics/?is_active=true&page_size=500&subject=${encodeURIComponent(subject.id)}&institute=${encodeURIComponent(instituteId)}`,
      { headers: authHeader },
    );
    const payload = await expectOkJson(response, `${subject.name} topics`);
    return new Map(payload.results.map((entry) => [entry.name, entry.code]));
  }

  const mathTopics = await fetchTopics(math);
  const scienceTopics = await fetchTopics(science);

  function mathCode(name) {
    const code = mathTopics.get(name);
    if (!code) {
      throw new Error(`Missing Math topic code for "${name}".`);
    }
    return code;
  }

  function scienceCode(name) {
    const code = scienceTopics.get(name);
    if (!code) {
      throw new Error(`Missing Science topic code for "${name}".`);
    }
    return code;
  }

  const seed = Date.now();
  const scenarios = [
    {
      title: `Class 7 Math Practice Pulse ${seed}`,
      code: `OBPMS-MATH-PP-${seed}`,
      description: "Single-section Class 7 Math practice pulse with 45 questions.",
      examType: "practice",
      selectionMode: "strict",
      durationMinutes: 45,
      instructions: "Practice each math question carefully and review immediately.",
      primarySubjectCode: math.code,
      sections: [
        section({
          name: "Math Pulse",
          order: 1,
          subjectCode: math.code,
          questionCount: 45,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [
            [mathCode("Arithmetic Expressions"), 15],
            [mathCode("Equivalent Fractions"), 15],
            [mathCode("Decimals"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Math Two-Part Check ${seed + 1}`,
      code: `OBPMS-MATH-TPC-${seed + 1}`,
      description: "Two-section Class 7 Math checkpoint with balanced accuracy lanes.",
      examType: "test",
      selectionMode: "strict",
      durationMinutes: 60,
      instructions: "Finish Section A before moving to Section B.",
      primarySubjectCode: math.code,
      sections: [
        section({
          name: "Core Accuracy",
          order: 1,
          subjectCode: math.code,
          questionCount: 20,
          difficultyMix: { foundation: 50, intermediate: 50, advanced: 0 },
          topics: [
            [mathCode("Division of Fractions"), 10],
            [mathCode("Multiplication of Fractions"), 10],
          ],
        }),
        section({
          name: "Reasoning Finish",
          order: 2,
          subjectCode: math.code,
          questionCount: 25,
          difficultyMix: { foundation: 30, intermediate: 70, advanced: 0 },
          topics: [
            [mathCode("Number Play"), 10],
            [mathCode("Order of Operations"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Math Section Sprint ${seed + 2}`,
      code: `OBPMS-MATH-SS-${seed + 2}`,
      description: "Three-section Class 7 Math sprint with discrete chapter lanes.",
      examType: "mock_exam",
      selectionMode: "strict",
      durationMinutes: 75,
      instructions: "Treat each section as a short chapter sprint.",
      primarySubjectCode: math.code,
      sections: [
        section({
          name: "Algebra Build-up",
          order: 1,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 35, intermediate: 65, advanced: 0 },
          topics: [[mathCode("Expressions using Letter-Numbers"), 15]],
        }),
        section({
          name: "Pattern Run",
          order: 2,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 25, intermediate: 75, advanced: 0 },
          topics: [[mathCode("Patterns and Rules"), 15]],
        }),
        section({
          name: "Geometry Close",
          order: 3,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [[mathCode("Triangle Properties"), 15]],
        }),
      ],
    },
    {
      title: `Class 7 Math Timed Focus ${seed + 3}`,
      code: `OBPMS-MATH-TF-${seed + 3}`,
      description: "Timed Class 7 Math builder with three short controlled sections.",
      examType: "test",
      selectionMode: "strict",
      durationMinutes: 60,
      instructions: "Complete each timed block within its timer window.",
      primarySubjectCode: math.code,
      sections: [
        section({
          name: "Arithmetic Window",
          order: 1,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [[mathCode("Arithmetic Expressions"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
        section({
          name: "Fractions Window",
          order: 2,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [[mathCode("Equivalent Fractions"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
        section({
          name: "Geometry Window",
          order: 3,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 50, intermediate: 50, advanced: 0 },
          topics: [[mathCode("Parallel and Intersecting Lines"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
      ],
    },
    {
      title: `Class 7 Math Relaxed Ladder ${seed + 4}`,
      code: `OBPMS-MATH-RL-${seed + 4}`,
      description: "Relaxed-mode Class 7 Math ladder with a broad revision-friendly mix.",
      examType: "practice",
      selectionMode: "relaxed",
      durationMinutes: 50,
      instructions: "Use this as a flexible ladder of difficulty for math revision.",
      primarySubjectCode: math.code,
      sections: [
        section({
          name: "Flexible Ladder",
          order: 1,
          subjectCode: math.code,
          questionCount: 45,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [
            [mathCode("Patterns and Sequences"), 15],
            [mathCode("Angles and Reasoning"), 15],
            [mathCode("Decimals"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Science Concept Pulse ${seed + 5}`,
      code: `OBPMS-SCI-CP-${seed + 5}`,
      description: "Single-section Class 7 Science concept pulse with full difficulty spread.",
      examType: "practice",
      selectionMode: "strict",
      durationMinutes: 45,
      instructions: "Review science concepts with a steady concept-to-application climb.",
      primarySubjectCode: science.code,
      sections: [
        section({
          name: "Science Pulse",
          order: 1,
          subjectCode: science.code,
          questionCount: 45,
          difficultyMix: { foundation: 40, intermediate: 30, advanced: 30 },
          topics: [
            [scienceCode("Acidic, Basic, and Neutral Substances"), 15],
            [scienceCode("Electric Circuits and Components"), 15],
            [scienceCode("Earth, Moon, and the Sun"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Science Chapter Matrix ${seed + 6}`,
      code: `OBPMS-SCI-CM-${seed + 6}`,
      description: "Three-section Class 7 Science matrix with progressively harder lanes.",
      examType: "test",
      selectionMode: "strict",
      durationMinutes: 70,
      instructions: "Move from foundation science to challenge questions section by section.",
      primarySubjectCode: science.code,
      sections: [
        section({
          name: "Life Science",
          order: 1,
          subjectCode: science.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 40, advanced: 20 },
          topics: [[scienceCode("Life Processes in Animals"), 15]],
        }),
        section({
          name: "Matter and Change",
          order: 2,
          subjectCode: science.code,
          questionCount: 15,
          difficultyMix: { foundation: 30, intermediate: 40, advanced: 30 },
          topics: [[scienceCode("Physical and Chemical Changes"), 15]],
        }),
        section({
          name: "Energy and Systems",
          order: 3,
          subjectCode: science.code,
          questionCount: 15,
          difficultyMix: { foundation: 20, intermediate: 40, advanced: 40 },
          topics: [[scienceCode("Heat Transfer in Nature"), 15]],
        }),
      ],
    },
    {
      title: `Class 7 Science Mock Ramp ${seed + 7}`,
      code: `OBPMS-SCI-MR-${seed + 7}`,
      description: "Two-section Class 7 Science mock with stronger advanced pressure.",
      examType: "mock_exam",
      selectionMode: "strict",
      durationMinutes: 75,
      instructions: "Treat this as a science mock with harder later questions.",
      primarySubjectCode: science.code,
      sections: [
        section({
          name: "Core Understanding",
          order: 1,
          subjectCode: science.code,
          questionCount: 20,
          difficultyMix: { foundation: 45, intermediate: 35, advanced: 20 },
          topics: [
            [scienceCode("Measurement of Time"), 10],
            [scienceCode("Motion in Everyday Life"), 10],
          ],
        }),
        section({
          name: "Advanced Push",
          order: 2,
          subjectCode: science.code,
          questionCount: 25,
          difficultyMix: { foundation: 20, intermediate: 30, advanced: 50 },
          topics: [
            [scienceCode("Metals and Non-metals"), 10],
            [scienceCode("Respiration in Organisms"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Math Science Balanced Mix ${seed + 8}`,
      code: `OBPMS-MIX-BM-${seed + 8}`,
      description: "Two-section mixed Class 7 Math and Science balanced exam.",
      examType: "test",
      selectionMode: "strict",
      durationMinutes: 65,
      instructions: "Complete the math section first, then move into science.",
      primarySubjectCode: "",
      sections: [
        section({
          name: "Math Precision",
          order: 1,
          subjectCode: math.code,
          questionCount: 20,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [
            [mathCode("Arithmetic Expressions"), 10],
            [mathCode("Equivalent Fractions"), 10],
          ],
        }),
        section({
          name: "Science Insight",
          order: 2,
          subjectCode: science.code,
          questionCount: 25,
          difficultyMix: { foundation: 20, intermediate: 40, advanced: 40 },
          topics: [
            [scienceCode("Forests: Our Lifeline"), 10],
            [scienceCode("Life Processes in Plants"), 15],
          ],
        }),
      ],
    },
    {
      title: `Class 7 Math Science Timed Mix ${seed + 9}`,
      code: `OBPMS-MIX-TM-${seed + 9}`,
      description: "Three-section timed mixed exam for Class 7 Math and Science.",
      examType: "mock_exam",
      selectionMode: "strict",
      durationMinutes: 70,
      instructions: "Respect the timer on each section and use the mixed layout as a full drill.",
      primarySubjectCode: "",
      sections: [
        section({
          name: "Math Warm-up",
          order: 1,
          subjectCode: math.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 60, advanced: 0 },
          topics: [[mathCode("Division of Fractions"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
        section({
          name: "Science Core",
          order: 2,
          subjectCode: science.code,
          questionCount: 15,
          difficultyMix: { foundation: 40, intermediate: 30, advanced: 30 },
          topics: [[scienceCode("Transportation in Animals and Plants"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
        section({
          name: "Science Challenge",
          order: 3,
          subjectCode: science.code,
          questionCount: 15,
          difficultyMix: { foundation: 20, intermediate: 30, advanced: 50 },
          topics: [[scienceCode("Wastewater Story"), 15]],
          timerEnabled: true,
          durationMinutes: 20,
        }),
      ],
    },
  ];

  const created = [];

  for (const scenario of scenarios) {
    const previewPayload = buildPayload({
      instituteCode: "OBPMS",
      academicYearName: selectedAcademicYear.name,
      programCode: program.code,
      primarySubjectCode: scenario.primarySubjectCode,
      scenario,
    });

    const previewResponse = await page.request.post(
      `${backendBaseUrl}/api/v1/exams/advanced-builder/preview/`,
      {
        headers: authHeader,
        data: previewPayload,
        timeout: 30000,
      },
    );
    const previewJson = await expectOkJson(previewResponse, `Preview ${scenario.code}`);
    if (!previewJson.valid) {
      throw new Error(`Preview ${scenario.code} was not valid.`);
    }
    if ((previewJson.blockers ?? []).length > 0) {
      throw new Error(`Preview ${scenario.code} returned blockers: ${JSON.stringify(previewJson.blockers)}`);
    }
    if (Number(previewJson.resolved_exam?.total_questions ?? 0) !== 45) {
      throw new Error(
        `Preview ${scenario.code} resolved ${previewJson.resolved_exam?.total_questions ?? "unknown"} questions instead of 45.`,
      );
    }

    const createResponse = await page.request.post(
      `${backendBaseUrl}/api/v1/exams/advanced-builder/create/`,
      {
        headers: authHeader,
        data: previewPayload,
        timeout: 30000,
      },
    );
    const createJson = await expectOkJson(createResponse, `Create ${scenario.code}`);
    const examId = String(createJson.data?.id ?? "");
    const activeQuestionsCount = Number(createJson.data?.active_questions_count ?? 0);
    if (!examId) {
      throw new Error(`Create ${scenario.code} succeeded but did not return an exam id.`);
    }
    if (activeQuestionsCount !== 45) {
      throw new Error(`Create ${scenario.code} returned ${activeQuestionsCount} active questions instead of 45.`);
    }

    const detailResponse = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
      headers: authHeader,
      timeout: 30000,
    });
    const detailJson = await expectOkJson(detailResponse, `Detail ${scenario.code}`);

    await page.goto(`${frontendBaseUrl}/institute/exams/${examId}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: new RegExp(escapeRegExp(scenario.title), "i") }).first().waitFor();

    await page.goto(`${frontendBaseUrl}/institute/exams/${examId}/builder?tab=questions`, {
      waitUntil: "networkidle",
    });
    await page.locator(".builderQuestionCard").first().waitFor({ timeout: 30000 });

    created.push({
      id: examId,
      code: scenario.code,
      title: scenario.title,
      examType: scenario.examType,
      selectionMode: scenario.selectionMode,
      detailStatus: detailJson.status,
      activeQuestionsCount,
      warnings: previewJson.warnings ?? [],
    });
    console.log(`CREATED ${scenario.code} -> ${examId} (${activeQuestionsCount} questions)`);
  }

  console.log(JSON.stringify({ createdCount: created.length, created }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
