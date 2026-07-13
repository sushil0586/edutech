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

let cachedAccessToken = "";
let cachedUsername = "";

function resolveAccessToken() {
  const user = currentUser(users);
  if (cachedAccessToken && cachedUsername === user.username) {
    return cachedAccessToken;
  }

  const loginPayload = login(baseUrl, user.username, user.password);
  cachedAccessToken = loginPayload.access;
  cachedUsername = user.username;
  return cachedAccessToken;
}

function hasArrayBody(response) {
  try {
    return Array.isArray(response.json());
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

function pickResultWithAttempt(results) {
  if (!Array.isArray(results)) {
    return null;
  }
  return results.find((result) => result?.attempt) || results[0] || null;
}

export default function () {
  const accessToken = resolveAccessToken();

  const resultsResponse = getJson(`${baseUrl}/api/v1/student/results/`, accessToken);
  check(resultsResponse, {
    "student results status is 200": (res) => res.status === 200,
    "student results returns array": (res) => hasArrayBody(res),
  });

  let targetResult = null;
  try {
    targetResult = pickResultWithAttempt(resultsResponse.json());
  } catch {
    targetResult = null;
  }

  check(targetResult, {
    "student results exposes at least one result row": (row) => Boolean(row),
  });

  if (targetResult?.attempt) {
    const summaryResponse = getJson(
      `${baseUrl}/api/v1/attempts/${targetResult.attempt}/summary/`,
      accessToken,
    );
    check(summaryResponse, {
      "student attempt summary status is 200": (res) => res.status === 200,
      "student attempt summary returns object": (res) => hasObjectBody(res),
    });

    const reviewResponse = getJson(
      `${baseUrl}/api/v1/attempts/${targetResult.attempt}/review/`,
      accessToken,
    );
    check(reviewResponse, {
      "student attempt review status is 200 or 403": (res) => res.status === 200 || res.status === 403,
      "student attempt review returns object-ish payload": (res) => {
        try {
          const body = res.json();
          return body !== null && typeof body === "object";
        } catch {
          return false;
        }
      },
    });
  }

  const insightResponse = getJson(`${baseUrl}/api/v1/student/insights/summary/`, accessToken);
  check(insightResponse, {
    "student insight status is 200": (res) => res.status === 200,
    "student insight returns object": (res) => hasObjectBody(res),
  });

  const questionAnalyticsResponse = getJson(
    `${baseUrl}/api/v1/student/insights/question-analytics/`,
    accessToken,
  );
  check(questionAnalyticsResponse, {
    "student analytics questions status is 200": (res) => res.status === 200,
    "student analytics questions returns object": (res) => hasObjectBody(res),
  });

  sleep(Number(__ENV.K6_THINK_TIME_SECONDS || 1));
}
