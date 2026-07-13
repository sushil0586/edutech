import { expect, type BrowserContext, type Page } from "@playwright/test";
import { getRoleCredentials, missingRoleEnvVars, type PlaywrightRole } from "../fixtures/env";
import { resolveBackendBaseUrl } from "./backend-base-url";

const backendBaseUrl = resolveBackendBaseUrl();
const frontendBaseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sessionProfileCookieName = "nexora_session_profile";
type SeedCookie = Parameters<BrowserContext["addCookies"]>[0][number];
const authDebugEnabled = process.env.PLAYWRIGHT_DEBUG_AUTH === "1";

function debugAuth(...args: unknown[]) {
  if (authDebugEnabled) {
    console.log("[pw-auth]", ...args);
  }
}

type SessionTokens = {
  access: string;
  refresh: string;
  profileSnapshot?: string;
};

type SessionTokenFetchResult = {
  tokens: SessionTokens | null;
  throttledMessage?: string;
};

type ProgrammaticRoleLoginResult =
  | true
  | {
      success: boolean;
      throttledMessage?: string;
    };

export type DirectLoginCredentials = {
  username: string;
  password: string;
};

const roleSessionCache = new Map<PlaywrightRole, SessionTokens>();
const credentialSessionCache = new Map<string, SessionTokens>();
const backendLoginAttemptLimit = 8;

function credentialCacheKey(credentials: DirectLoginCredentials) {
  return `${credentials.username.trim().toLowerCase()}::${credentials.password}`;
}

function roleWorkspacePattern(role: PlaywrightRole) {
  switch (role) {
    case "admin":
      return /^\/admin(\/|$)/;
    case "teacher":
      return /^\/teacher(\/|$)/;
    case "institute":
      return /^\/institute(\/|$)/;
    case "student":
      return /^\/app(\/|$)/;
    case "parent":
      return /^\/parent(\/|$)/;
    default:
      return /^\/$/;
  }
}

function roleWorkspacePath(role: PlaywrightRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher/dashboard";
    case "institute":
      return "/institute/dashboard";
    case "student":
      return "/app/exams";
    case "parent":
      return "/parent/dashboard";
    default:
      return "/";
  }
}

function throttleBackoffMs(message: string) {
  const seconds = Number(message.match(/available in\s+(\d+)\s+seconds?/i)?.[1] ?? "");
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000 + 500;
  }
  return null;
}

function createProfileSnapshot(user: Record<string, unknown> | undefined) {
  if (!user) {
    return undefined;
  }

  return encodeURIComponent(
    JSON.stringify({
      id: String(user.id ?? ""),
      username: String(user.username ?? ""),
      display_name: String(user.display_name ?? user.username ?? ""),
      role: String(user.role ?? ""),
      institute: user.institute == null ? null : String(user.institute),
      institute_name: user.institute_name == null ? null : String(user.institute_name),
      student_profile: user.student_profile == null ? null : String(user.student_profile),
      teacher_profile: user.teacher_profile == null ? null : String(user.teacher_profile),
      onboarding_status: user.onboarding_status == null ? undefined : String(user.onboarding_status),
      profile_completion_required: Boolean(user.profile_completion_required),
      onboarding_role: user.onboarding_role == null ? undefined : String(user.onboarding_role),
      is_active: Boolean(user.is_active ?? true),
    }),
  );
}

async function fetchSessionTokensFromBackend(
  page: Page,
  credentials: DirectLoginCredentials,
): Promise<SessionTokenFetchResult> {
  debugAuth("fetch-session-start", credentials.username);
  let throttledMessage: string | undefined;

  for (let attempt = 1; attempt <= backendLoginAttemptLimit; attempt += 1) {
    let response;
    try {
      response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
        data: {
          username: credentials.username,
          password: credentials.password,
        },
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });
    } catch {
      response = null;
    }

    if (!response) {
      if (attempt < backendLoginAttemptLimit) {
        await page.waitForTimeout(750 * attempt);
      }
      continue;
    }

    if (!response.ok()) {
      const snippet = (await response.text().catch(() => "")).trim();
      const throttleDelay = throttleBackoffMs(snippet);
      if (throttleDelay != null) {
        throttledMessage = snippet;
      }
      if (attempt < backendLoginAttemptLimit) {
        debugAuth("fetch-session-retry", credentials.username, attempt, response.status());
        await page.waitForTimeout(throttleDelay ?? 750 * attempt);
        continue;
      }
      return {
        tokens: null,
        throttledMessage,
      };
    }

    let payload: {
      access?: string;
      refresh?: string;
      user?: Record<string, unknown>;
    };
    try {
      payload = (await response.json()) as {
        access?: string;
        refresh?: string;
        user?: Record<string, unknown>;
      };
    } catch {
      return {
        tokens: null,
        throttledMessage,
      };
    }

    const access = payload.access?.trim() ?? "";
    const refresh = payload.refresh?.trim() ?? "";
    if (!access || !refresh) {
      return {
        tokens: null,
        throttledMessage,
      };
    }

    return {
      tokens: {
        access,
        refresh,
        profileSnapshot: createProfileSnapshot(payload.user),
      },
      throttledMessage,
    };
  }

  return {
    tokens: null,
    throttledMessage,
  };
}

async function seedSessionCookies(page: Page, tokens: SessionTokens) {
  debugAuth("seed-cookies-start");
  await page.context().clearCookies();
  const cookies: SeedCookie[] = [
    {
      name: "nexora_access_token",
      value: tokens.access,
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
    {
      name: "nexora_refresh_token",
      value: tokens.refresh,
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ];

  if (tokens.profileSnapshot) {
    cookies.push({
      name: sessionProfileCookieName,
      value: tokens.profileSnapshot,
      url: frontendBaseUrl,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    });
  }

  await page.context().addCookies(cookies);
  debugAuth("seed-cookies-done", cookies.length);
}

async function cacheSessionTokensFromContext(page: Page, role: PlaywrightRole) {
  debugAuth("cache-session-from-context-start", role, page.url());
  const cookies = await page.context().cookies();
  const access = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  const refresh = cookies.find((cookie) => cookie.name === "nexora_refresh_token")?.value?.trim() ?? "";
  if (!access || !refresh) {
    return;
  }
  roleSessionCache.set(role, { access, refresh });
  debugAuth("cache-session-from-context-done", role);
}

async function fetchRoleSessionTokens(page: Page, role: PlaywrightRole) {
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    throw new Error(
      `Missing Playwright credentials for ${role}. Set ${missingRoleEnvVars(role).join(" and ")}.`,
    );
  }

  const { tokens, throttledMessage } = await fetchSessionTokensFromBackend(page, credentials);
  if (!tokens) {
    return {
      tokens: null,
      throttledMessage,
    };
  }

  roleSessionCache.set(role, tokens);
  return {
    tokens,
    throttledMessage,
  };
}

async function fetchSessionTokensForCredentials(page: Page, credentials: DirectLoginCredentials) {
  const cacheKey = credentialCacheKey(credentials);
  const cachedTokens = credentialSessionCache.get(cacheKey);
  if (cachedTokens) {
    return {
      tokens: cachedTokens,
    };
  }

  const { tokens, throttledMessage } = await fetchSessionTokensFromBackend(page, credentials);
  if (!tokens) {
    return {
      tokens: null,
      throttledMessage,
    };
  }

  credentialSessionCache.set(cacheKey, tokens);
  return {
    tokens,
    throttledMessage,
  };
}

async function tryProgrammaticRoleLogin(
  page: Page,
  role: PlaywrightRole,
): Promise<ProgrammaticRoleLoginResult> {
  const cachedTokens = roleSessionCache.get(role);
  if (cachedTokens) {
    try {
      await seedSessionCookies(page, cachedTokens);
      await page.goto(roleWorkspacePath(role), { waitUntil: "domcontentloaded" });
      debugAuth("programmatic-cached-nav", role, page.url());
      if (roleWorkspacePattern(role).test(new URL(page.url()).pathname)) {
        return true;
      }
    } catch {
      // Fall back to interactive login when cookie-seeded navigation aborts.
    }
    roleSessionCache.delete(role);
  }

  const result = await fetchRoleSessionTokens(page, role);
  debugAuth("programmatic-fetched-tokens", role, Boolean(result.tokens));
  if (!result.tokens) {
    return {
      success: false,
      throttledMessage: result.throttledMessage,
    };
  }

  try {
    await seedSessionCookies(page, result.tokens);
    await page.goto(roleWorkspacePath(role), { waitUntil: "domcontentloaded" });
    debugAuth("programmatic-fresh-nav", role, page.url());
    return {
      success: roleWorkspacePattern(role).test(new URL(page.url()).pathname),
      throttledMessage: result.throttledMessage,
    };
  } catch {
    return {
      success: false,
      throttledMessage: result.throttledMessage,
    };
  }
}

export async function loginAsRole(page: Page, role: PlaywrightRole) {
  debugAuth("login-start", role);
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    throw new Error(
      `Missing Playwright credentials for ${role}. Set ${missingRoleEnvVars(role).join(" and ")}.`,
    );
  }

  const programmaticLoginResult = await tryProgrammaticRoleLogin(page, role);
  debugAuth("login-programmatic-result", role, programmaticLoginResult);
  if (programmaticLoginResult === true || programmaticLoginResult.success) {
    return;
  }
  if (programmaticLoginResult.throttledMessage) {
    throw new Error(
      `Playwright login for ${role} is throttled by the backend: ${programmaticLoginResult.throttledMessage}`,
    );
  }

  await page.goto(`/login?role=${role}`);
  debugAuth("login-fallback-page", role, page.url());
  const loginHeading = page.getByRole("heading", { name: /sign-in|welcome back/i }).first();
  const currentPath = new URL(page.url()).pathname;

  if (!(await loginHeading.isVisible().catch(() => false))) {
    if (roleWorkspacePattern(role).test(currentPath)) {
      return;
    }

    const logoutButton = page.getByRole("button", { name: /logout/i }).first();
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/);
      await page.goto(`/login?role=${role}`);
    }
  }

  await expect(loginHeading).toBeVisible();
  debugAuth("login-fallback-heading-visible", role);

  await page.locator('input[name="username"]').fill(credentials.username);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /continue to workspace/i }).click();
  debugAuth("login-fallback-submitted", role);

  const authError = page.locator(".authError").first();
  const authErrorText = ((await authError.textContent().catch(() => "")) ?? "").trim();
  if (authErrorText) {
    throw new Error(`Interactive Playwright login failed for ${role}: ${authErrorText}`);
  }

  await expect
    .poll(
      () => {
        const path = new URL(page.url()).pathname;
        return (
          /^\/(teacher|institute|app|admin|parent)(\/|$)/.test(path) ||
          path === "/complete-profile"
        );
      },
      { timeout: 30000 },
    )
    .toBe(true);

  await cacheSessionTokensFromContext(page, role);
}

export async function loginWithCredentials(
  page: Page,
  credentials: DirectLoginCredentials,
  role: PlaywrightRole,
) {
  const cacheKey = credentialCacheKey(credentials);
  const result = await fetchSessionTokensForCredentials(page, credentials);
  if (result.tokens) {
    await seedSessionCookies(page, result.tokens);
    await page.goto(roleWorkspacePath(role), { waitUntil: "domcontentloaded" });
    if (roleWorkspacePattern(role).test(new URL(page.url()).pathname)) {
      return;
    }
    credentialSessionCache.delete(cacheKey);
  } else if (result.throttledMessage) {
    throw new Error(`Playwright login for ${role} is throttled by the backend: ${result.throttledMessage}`);
  }

  await page.goto(`/login?role=${role}`);
  const loginHeading = page.getByRole("heading", { name: /sign-in|welcome back/i }).first();
  if (!(await loginHeading.isVisible().catch(() => false))) {
    const currentPath = new URL(page.url()).pathname;
    if (roleWorkspacePattern(role).test(currentPath)) {
      return;
    }

    const logoutButton = page.getByRole("button", { name: /logout/i }).first();
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/);
      await page.goto(`/login?role=${role}`);
    }
  }

  await expect(loginHeading).toBeVisible();

  await page.locator('input[name="username"]').fill(credentials.username);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /continue to workspace/i }).click();

  const authError = page.locator(".authError").first();
  const authErrorText = ((await authError.textContent().catch(() => "")) ?? "").trim();
  if (authErrorText) {
    throw new Error(`Interactive Playwright login failed for ${role}: ${authErrorText}`);
  }

  await expect
    .poll(
      () => {
        const path = new URL(page.url()).pathname;
        return roleWorkspacePattern(role).test(path) || path === "/complete-profile";
      },
      { timeout: 30000 },
    )
    .toBe(true);

  await cacheSessionTokensFromContext(page, role);
  const cookies = await page.context().cookies();
  const access = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  const refresh = cookies.find((cookie) => cookie.name === "nexora_refresh_token")?.value?.trim() ?? "";
  if (access && refresh) {
    credentialSessionCache.set(cacheKey, { access, refresh });
  }
}

export function testRequiresRole(role: PlaywrightRole) {
  return !getRoleCredentials(role);
}
