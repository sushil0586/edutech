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
  ...resolveStagesOptions(48),
  thresholds: {
    http_req_failed: ["rate<0.01"],
    me_duration: ["p(95)<1000"],
    available_exams_duration: ["p(95)<2000"],
  },
};

const meDuration = new Trend("me_duration");
const availableExamsDuration = new Trend("available_exams_duration");

function login(username, password) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login/`,
    JSON.stringify({ username, password }),
    {
      headers: { "Content-Type": "application/json" },
      timeout,
      tags: { endpoint: "login_setup" },
    },
  );

  check(response, {
    "setup login status is 200": (res) => res.status === 200,
    "setup login has access token": (res) => {
      try {
        return Boolean(res.json("access"));
      } catch {
        return false;
      }
    },
  });

  return response;
}

function getWithToken(url, token, tag) {
  return http.get(url, {
    headers: authHeaders(token),
    timeout,
    tags: { endpoint: tag },
  });
}

export function setup() {
  const tokensByUsername = {};

  for (const user of users) {
    const loginResponse = login(user.username, user.password);
    const accessToken = loginResponse.json("access");
    if (accessToken) {
      tokensByUsername[user.username] = accessToken;
    }
  }

  return { tokensByUsername };
}

export default function (data) {
  const user = currentUser(users);
  const accessToken = data?.tokensByUsername?.[user.username];

  const meResponse = getWithToken(`${baseUrl}/api/v1/auth/me/`, accessToken, "me");
  meDuration.add(meResponse.timings.duration);
  check(meResponse, {
    "me status is 200": (res) => res.status === 200,
  });

  const availableExamsResponse = getWithToken(
    `${baseUrl}/api/v1/student/exams/available/`,
    accessToken,
    "available_exams",
  );
  availableExamsDuration.add(availableExamsResponse.timings.duration);
  check(availableExamsResponse, {
    "available exams status is 200": (res) => res.status === 200,
    "available exams returns array": (res) => {
      try {
        return Array.isArray(res.json());
      } catch {
        return false;
      }
    },
  });

  sleep(Number(__ENV.K6_THINK_TIME_SECONDS || 1));
}
