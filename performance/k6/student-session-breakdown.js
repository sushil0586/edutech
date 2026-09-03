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
    login_duration: ["p(95)<1000"],
    me_duration: ["p(95)<1000"],
    available_exams_duration: ["p(95)<2000"],
  },
};

const loginDuration = new Trend("login_duration");
const meDuration = new Trend("me_duration");
const availableExamsDuration = new Trend("available_exams_duration");

function login(username, password) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login/`,
    JSON.stringify({ username, password }),
    {
      headers: { "Content-Type": "application/json" },
      timeout,
      tags: { endpoint: "login" },
    },
  );
  loginDuration.add(response.timings.duration);
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
  return response;
}

function getWithToken(url, token, tag) {
  return http.get(url, {
    headers: authHeaders(token),
    timeout,
    tags: { endpoint: tag },
  });
}

export default function () {
  const user = currentUser(users);
  const loginResponse = login(user.username, user.password);
  const accessToken = loginResponse.json("access");

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
