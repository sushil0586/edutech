import exec from "k6/execution";
import http from "k6/http";
import { check, fail } from "k6";

const DEFAULT_TIMEOUT = __ENV.K6_HTTP_TIMEOUT || "30s";

export function parseJsonEnv(name, fallback) {
  const raw = __ENV[name];
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${name}: ${String(error)}`);
  }
}

export function resolveBaseUrl() {
  const baseUrl = (__ENV.K6_BASE_URL || __ENV.PLAYWRIGHT_BASE_URL || __ENV.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    fail("K6_BASE_URL is required.");
  }
  return baseUrl;
}

export function resolveUsers() {
  const users = parseJsonEnv("K6_USER_CREDENTIALS_JSON", []);
  if (!Array.isArray(users) || users.length === 0) {
    fail("K6_USER_CREDENTIALS_JSON must be a non-empty JSON array of { username, password }.");
  }
  return users;
}

export function currentUser(users) {
  const index = Math.max(exec.vu.idInTest - 1, 0) % users.length;
  const user = users[index];
  if (!user?.username || !user?.password) {
    fail(`Invalid user entry at index ${index}.`);
  }
  return user;
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function jsonParams(token) {
  return {
    headers: authHeaders(token),
    timeout: DEFAULT_TIMEOUT,
  };
}

export function postJson(url, payload, token) {
  return http.post(url, JSON.stringify(payload), jsonParams(token));
}

export function getJson(url, token) {
  return http.get(url, {
    headers: token ? authHeaders(token) : {},
    timeout: DEFAULT_TIMEOUT,
  });
}

export function login(baseUrl, username, password) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login/`,
    JSON.stringify({ username, password }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: DEFAULT_TIMEOUT,
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
  }) || fail(`Login failed for ${username} with status ${response.status}.`);

  return response.json();
}

export function resolveStagesOptions(defaultIterations = 1) {
  const stages = parseJsonEnv("K6_STAGES_JSON", null);
  if (Array.isArray(stages) && stages.length > 0) {
    return {
      stages,
      thresholds: defaultThresholds(),
    };
  }

  const vus = Number(__ENV.K6_VUS || 1);
  const iterations = Number(__ENV.K6_ITERATIONS || defaultIterations);
  return {
    vus,
    iterations,
    thresholds: defaultThresholds(),
  };
}

function defaultThresholds() {
  return {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  };
}

export function pickStartableExam(exams) {
  if (!Array.isArray(exams)) {
    return null;
  }

  return (
    exams.find((exam) => exam?.can_resume && exam?.active_attempt?.id) ||
    exams.find((exam) => exam?.can_start) ||
    null
  );
}

export function pickAnswerableQuestions(detail, limit) {
  if (!detail || !Array.isArray(detail.questions)) {
    return [];
  }

  return detail.questions
    .filter((question) => Array.isArray(question.options) && question.options.length > 0)
    .slice(0, limit);
}

export function buildSingleChoicePayload(question, index) {
  const option = question?.options?.[index % question.options.length] || question?.options?.[0];
  if (!option?.id) {
    return null;
  }

  return {
    question: question.question,
    selected_option: option.id,
    time_spent_seconds: Number(__ENV.K6_TIME_SPENT_SECONDS || 15),
    is_marked_for_review: false,
  };
}
