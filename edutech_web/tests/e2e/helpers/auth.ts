import { expect, Page } from "@playwright/test";
import { getRoleCredentials, missingRoleEnvVars, type PlaywrightRole } from "../fixtures/env";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const frontendBaseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

type SessionTokens = {
  access: string;
  refresh: string;
};

const roleSessionCache = new Map<PlaywrightRole, SessionTokens>();

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
    default:
      return "/";
  }
}

async function seedSessionCookies(page: Page, tokens: SessionTokens) {
  await page.context().clearCookies();
  await page.context().addCookies([
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
  ]);
}

async function cacheSessionTokensFromContext(page: Page, role: PlaywrightRole) {
  const cookies = await page.context().cookies();
  const access = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  const refresh = cookies.find((cookie) => cookie.name === "nexora_refresh_token")?.value?.trim() ?? "";
  if (!access || !refresh) {
    return;
  }
  roleSessionCache.set(role, { access, refresh });
}

async function fetchRoleSessionTokens(page: Page, role: PlaywrightRole) {
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    throw new Error(
      `Missing Playwright credentials for ${role}. Set ${missingRoleEnvVars(role).join(" and ")}.`,
    );
  }

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
    });
  } catch {
    return null;
  }

  if (!response.ok()) {
    return null;
  }

  let payload: {
    access?: string;
    refresh?: string;
  };
  try {
    payload = (await response.json()) as {
      access?: string;
      refresh?: string;
    };
  } catch {
    return null;
  }
  const access = payload.access?.trim() ?? "";
  const refresh = payload.refresh?.trim() ?? "";
  if (!access || !refresh) {
    return null;
  }

  const tokens = { access, refresh };
  roleSessionCache.set(role, tokens);
  return tokens;
}

async function tryProgrammaticRoleLogin(page: Page, role: PlaywrightRole) {
  const cachedTokens = roleSessionCache.get(role);
  if (cachedTokens) {
    try {
      await seedSessionCookies(page, cachedTokens);
      await page.goto(roleWorkspacePath(role));
      if (roleWorkspacePattern(role).test(new URL(page.url()).pathname)) {
        return true;
      }
    } catch {
      // Fall back to interactive login when cookie-seeded navigation aborts.
    }
    roleSessionCache.delete(role);
  }

  const freshTokens = await fetchRoleSessionTokens(page, role);
  if (!freshTokens) {
    return false;
  }

  try {
    await seedSessionCookies(page, freshTokens);
    await page.goto(roleWorkspacePath(role));
    return roleWorkspacePattern(role).test(new URL(page.url()).pathname);
  } catch {
    return false;
  }
}

export async function loginAsRole(page: Page, role: PlaywrightRole) {
  const credentials = getRoleCredentials(role);
  if (!credentials) {
    throw new Error(
      `Missing Playwright credentials for ${role}. Set ${missingRoleEnvVars(role).join(" and ")}.`,
    );
  }

  if (await tryProgrammaticRoleLogin(page, role)) {
    return;
  }

  await page.goto(`/login?role=${role}`);
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

  await page.locator('input[name="username"]').fill(credentials.username);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /continue to workspace/i }).click();

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

export function testRequiresRole(role: PlaywrightRole) {
  return !getRoleCredentials(role);
}
