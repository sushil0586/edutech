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
const availableExamsQuery = String(__ENV.K6_AVAILABLE_EXAMS_QUERY || "").replace(/^\?/, "");
const availableExamsUrl = `${baseUrl}/api/v1/student/exams/available/${
  availableExamsQuery ? `?${availableExamsQuery}` : ""
}`;

export const options = resolveStagesOptions(1);

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

export default function () {
  const accessToken = resolveAccessToken();

  const meResponse = getJson(`${baseUrl}/api/v1/auth/me/`, accessToken);
  check(meResponse, {
    "me status is 200": (res) => res.status === 200,
  });

  const availableExamsResponse = getJson(availableExamsUrl, accessToken);
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
