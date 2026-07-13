import { check, sleep } from "k6";
import {
  currentUser,
  getJson,
  login,
  resolveBaseUrl,
  resolveStagesOptions,
  resolveUsers,
} from "./lib/helpers.js";

const baseUrl = resolveBaseUrl();
const users = resolveUsers();

export const options = {
  ...resolveStagesOptions(1),
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

function hasArrayBody(response, path = "") {
  try {
    const body = path ? response.json(path) : response.json();
    return Array.isArray(body);
  } catch {
    return false;
  }
}

function hasObjectBody(response) {
  try {
    const body = response.json();
    return body !== null && typeof body === "object" && !Array.isArray(body);
  } catch {
    return false;
  }
}

export default function () {
  const user = currentUser(users);
  const loginPayload = login(baseUrl, user.username, user.password);
  const accessToken = loginPayload.access;

  const resultsResponse = getJson(`${baseUrl}/api/v1/student/results/`, accessToken);
  check(resultsResponse, {
    "student results status is 200": (res) => res.status === 200,
    "student results returns array": (res) => hasArrayBody(res),
  });

  const insightResponse = getJson(`${baseUrl}/api/v1/student/insights/summary/`, accessToken);
  check(insightResponse, {
    "student insight status is 200": (res) => res.status === 200,
    "student insight returns object": (res) => hasObjectBody(res),
    "student insight has recent exams": (res) => hasArrayBody(res, "recent_exams"),
  });

  const questionAnalyticsResponse = getJson(`${baseUrl}/api/v1/student/insights/question-analytics/`, accessToken);
  check(questionAnalyticsResponse, {
    "student analytics questions status is 200": (res) => res.status === 200,
    "student analytics questions returns object": (res) => hasObjectBody(res),
    "student analytics questions list exists": (res) => hasArrayBody(res, "questions"),
  });

  sleep(Number(__ENV.K6_THINK_TIME_SECONDS || 1));
}
