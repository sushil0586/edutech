import { Trend } from "k6/metrics";
import { check, sleep } from "k6";
import http from "k6/http";
import {
  authHeaders,
  currentUser,
  resolveBaseUrl,
  resolveStagesOptions,
  resolveUsers,
} from "./lib/helpers.js";

const baseUrl = resolveBaseUrl();
const users = resolveUsers();
const timeout = __ENV.K6_HTTP_TIMEOUT || "30s";

export const options = {
  ...resolveStagesOptions(1),
  thresholds: {
    http_req_failed: ["rate<0.01"],
    results_duration: ["p(95)<2000"],
    attempt_summary_duration: ["p(95)<2000"],
    attempt_review_duration: ["p(95)<2000"],
    insight_duration: ["p(95)<2000"],
    analytics_duration: ["p(95)<2000"],
  },
};

const resultsDuration = new Trend("results_duration");
const attemptSummaryDuration = new Trend("attempt_summary_duration");
const attemptReviewDuration = new Trend("attempt_review_duration");
const insightDuration = new Trend("insight_duration");
const analyticsDuration = new Trend("analytics_duration");

let cachedAccessToken = "";
let cachedUsername = "";

function resolveAccessToken() {
  const user = currentUser(users);
  if (cachedAccessToken && cachedUsername === user.username) {
    return cachedAccessToken;
  }

  const response = http.post(
    `${baseUrl}/api/v1/auth/login/`,
    JSON.stringify({ username: user.username, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      timeout,
      tags: { endpoint: "login" },
    },
  );

  check(response, {
    "login status is 200": (res) => res.status === 200,
    "login has access token": (res) => {
      try {
        return Boolean(res.json("access"));
      } catch {
        return false;
      }
    },
  });

  cachedAccessToken = response.json("access");
  cachedUsername = user.username;
  return cachedAccessToken;
}

function getWithToken(url, token, tag) {
  return http.get(url, {
    headers: authHeaders(token),
    timeout,
    tags: { endpoint: tag },
  });
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

  const resultsResponse = getWithToken(`${baseUrl}/api/v1/student/results/`, accessToken, "results");
  resultsDuration.add(resultsResponse.timings.duration);
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
    const summaryResponse = getWithToken(
      `${baseUrl}/api/v1/attempts/${targetResult.attempt}/summary/`,
      accessToken,
      "attempt_summary",
    );
    attemptSummaryDuration.add(summaryResponse.timings.duration);
    check(summaryResponse, {
      "student attempt summary status is 200": (res) => res.status === 200,
      "student attempt summary returns object": (res) => hasObjectBody(res),
    });

    const reviewResponse = getWithToken(
      `${baseUrl}/api/v1/attempts/${targetResult.attempt}/review/`,
      accessToken,
      "attempt_review",
    );
    attemptReviewDuration.add(reviewResponse.timings.duration);
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

  const insightResponse = getWithToken(
    `${baseUrl}/api/v1/student/insights/summary/`,
    accessToken,
    "insight_summary",
  );
  insightDuration.add(insightResponse.timings.duration);
  check(insightResponse, {
    "student insight status is 200": (res) => res.status === 200,
    "student insight returns object": (res) => hasObjectBody(res),
  });

  const analyticsResponse = getWithToken(
    `${baseUrl}/api/v1/student/insights/question-analytics/`,
    accessToken,
    "question_analytics",
  );
  analyticsDuration.add(analyticsResponse.timings.duration);
  check(analyticsResponse, {
    "student analytics questions status is 200": (res) => res.status === 200,
    "student analytics questions returns object": (res) => hasObjectBody(res),
  });

  sleep(Number(__ENV.K6_THINK_TIME_SECONDS || 1));
}
