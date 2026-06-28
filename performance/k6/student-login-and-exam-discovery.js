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

export const options = resolveStagesOptions(1);

export default function () {
  const user = currentUser(users);
  const loginPayload = login(baseUrl, user.username, user.password);
  const accessToken = loginPayload.access;

  const meResponse = getJson(`${baseUrl}/api/v1/auth/me/`, accessToken);
  check(meResponse, {
    "me status is 200": (res) => res.status === 200,
  });

  const availableExamsResponse = getJson(`${baseUrl}/api/v1/student/exams/available/`, accessToken);
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
