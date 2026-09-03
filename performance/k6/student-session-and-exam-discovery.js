import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import {
  currentUser,
  getJson,
  login,
  parseJsonEnv,
  resolveBaseUrl,
  resolveStagesOptions,
  resolveUsers,
} from "./lib/helpers.js";

const baseUrl = resolveBaseUrl();
const users = resolveUsers();
const accessTokens = parseJsonEnv("K6_ACCESS_TOKENS_JSON", []);
const availableExamsQuery = String(__ENV.K6_AVAILABLE_EXAMS_QUERY || "").replace(/^\?/, "");
const availableExamsUrl = `${baseUrl}/api/v1/student/exams/available/${
  availableExamsQuery ? `?${availableExamsQuery}` : ""
}`;
const meDuration = new Trend("student_discovery_me_duration", true);
const availableExamsDuration = new Trend("student_discovery_available_exams_duration", true);

export const options = resolveStagesOptions(1);

let cachedAccessToken = "";
let cachedUsername = "";

function resolveAccessToken() {
  const user = currentUser(users);
  const preissuedToken =
    user.access ? user : accessTokens.find((token) => token?.username === user.username);
  if (preissuedToken?.access) {
    return preissuedToken.access;
  }

  if (cachedAccessToken && cachedUsername === user.username) {
    return cachedAccessToken;
  }

  const loginPayload = login(baseUrl, user.username, user.password);
  cachedAccessToken = loginPayload.access;
  cachedUsername = user.username;
  return cachedAccessToken;
}

export default function () {
  const accessToken = resolveAccessToken();

  const meResponse = getJson(`${baseUrl}/api/v1/auth/me/`, accessToken);
  meDuration.add(meResponse.timings.duration);
  check(meResponse, {
    "me status is 200": (res) => res.status === 200,
  });

  const availableExamsResponse = getJson(availableExamsUrl, accessToken);
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
