import { check, fail, sleep } from "k6";
import {
  buildSingleChoicePayload,
  currentUser,
  getJson,
  login,
  pickAnswerableQuestions,
  pickStartableExam,
  postJson,
  resolveBaseUrl,
  resolveStagesOptions,
  resolveUsers,
} from "./lib/helpers.js";

const baseUrl = resolveBaseUrl();
const users = resolveUsers();
const saveCount = Number(__ENV.K6_SAVE_COUNT || 10);
const submitAtEnd = String(__ENV.K6_SUBMIT_AT_END || "true").toLowerCase() === "true";

export const options = {
  ...resolveStagesOptions(1),
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2500"],
  },
};

export default function () {
  const user = currentUser(users);
  const loginPayload = login(baseUrl, user.username, user.password);
  const accessToken = loginPayload.access;
  const studentId = loginPayload.user?.student_profile;

  if (!studentId) {
    fail(`User ${user.username} does not have a student_profile in login payload.`);
  }

  const examsResponse = getJson(`${baseUrl}/api/v1/student/exams/available/`, accessToken);
  check(examsResponse, {
    "available exams status is 200": (res) => res.status === 200,
  }) || fail(`Available exams request failed for ${user.username}.`);

  const exams = examsResponse.json();
  const exam = pickStartableExam(exams);
  if (!exam) {
    fail(`No startable or resumable exam found for ${user.username}.`);
  }

  let attemptId = exam.active_attempt?.id || null;

  if (!attemptId) {
    const startResponse = postJson(
      `${baseUrl}/api/v1/attempts/start/`,
      {
        exam: exam.id,
        student: studentId,
      },
      accessToken,
    );

    check(startResponse, {
      "attempt start status is 201": (res) => res.status === 201,
    }) || fail(`Attempt start failed for ${user.username} with status ${startResponse.status}.`);

    attemptId = startResponse.json("data.id") || startResponse.json("id");
  }

  if (!attemptId) {
    fail(`Could not resolve attempt id for ${user.username}.`);
  }

  const detailResponse = getJson(`${baseUrl}/api/v1/attempts/${attemptId}/`, accessToken);
  check(detailResponse, {
    "attempt detail status is 200": (res) => res.status === 200,
  }) || fail(`Attempt detail failed for ${user.username}.`);

  const detail = detailResponse.json();
  const questions = pickAnswerableQuestions(detail, saveCount);
  if (questions.length === 0) {
    fail(`No answerable option-based questions found for attempt ${attemptId}.`);
  }

  for (let index = 0; index < questions.length; index += 1) {
    const payload = buildSingleChoicePayload(questions[index], index);
    if (!payload) {
      continue;
    }

    const saveResponse = postJson(
      `${baseUrl}/api/v1/attempts/${attemptId}/save-answer/`,
      payload,
      accessToken,
    );

    check(saveResponse, {
      "save answer status is 200": (res) => res.status === 200,
    });

    sleep(Number(__ENV.K6_SAVE_THINK_TIME_SECONDS || 0.2));
  }

  if (submitAtEnd) {
    const submitResponse = postJson(
      `${baseUrl}/api/v1/attempts/${attemptId}/submit/`,
      {
        auto_submitted: false,
      },
      accessToken,
    );

    check(submitResponse, {
      "submit status is 200": (res) => res.status === 200,
    }) || fail(`Submit failed for ${user.username} with status ${submitResponse.status}.`);
  }
}
