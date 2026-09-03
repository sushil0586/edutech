import { expect, test } from "@playwright/test";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const backendHealthUrl = `${backendBaseUrl}/api/v1/health/`;
const backendWorkingDirectory = `${process.cwd()}/../edutech_backend`;
const backendCommand = process.env.PLAYWRIGHT_BACKEND_COMMAND ?? `${backendWorkingDirectory}/.venv/bin/python`;
const backendArgs = (process.env.PLAYWRIGHT_BACKEND_ARGS ?? "manage.py runserver 9001 --noreload")
  .split(" ")
  .filter(Boolean);

let restartedBackendProcess: ChildProcessWithoutNullStreams | null = null;
let backendLogBuffer = "";
let backendWasInitiallyUp = false;

function spawnDetachedBackendRuntime() {
  const detachedProcess = spawn(backendCommand, backendArgs, {
    cwd: backendWorkingDirectory,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
    },
    stdio: "ignore",
    detached: true,
  });
  detachedProcess.unref();
}

async function waitForBackendState(expectedUp: boolean, timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(backendHealthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (expectedUp && response.ok) {
        return;
      }
      if (!expectedUp) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
    } catch {
      if (!expectedUp) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    expectedUp
      ? `Backend did not become healthy within ${timeoutMs}ms.\n${backendLogBuffer}`
      : `Backend did not stop within ${timeoutMs}ms.`,
  );
}

async function stopBackendRuntime() {
  if (restartedBackendProcess && !restartedBackendProcess.killed) {
    restartedBackendProcess.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (restartedBackendProcess && !restartedBackendProcess.killed) {
    restartedBackendProcess.kill("SIGKILL");
  }
  restartedBackendProcess = null;

  await waitForBackendState(false, 30000);
}

async function startBackendRuntime() {
  backendLogBuffer = "";
  restartedBackendProcess = spawn(backendCommand, backendArgs, {
    cwd: backendWorkingDirectory,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
    },
    stdio: "pipe",
  });

  restartedBackendProcess.stdout.on("data", (chunk) => {
    backendLogBuffer += chunk.toString();
  });
  restartedBackendProcess.stderr.on("data", (chunk) => {
    backendLogBuffer += chunk.toString();
  });

  await waitForBackendState(true, 60000);
}

async function withBackendOutage(assertion: () => Promise<void>) {
  await stopBackendRuntime();

  try {
    await assertion();
  } finally {
    await startBackendRuntime();
  }
}

test.describe("Operator backend outage state coverage", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    testRequiresRole("admin") || testRequiresRole("teacher") || testRequiresRole("institute"),
    "Admin, teacher, and institute Playwright credentials are required for operator outage coverage.",
  );

  test.beforeAll(async () => {
    try {
      await waitForBackendState(true, 3000);
      backendWasInitiallyUp = true;
    } catch {
      backendWasInitiallyUp = false;
    }

    if (backendWasInitiallyUp) {
      try {
        execFileSync("pkill", ["-f", "manage.py runserver 9001"], {
          stdio: "ignore",
        });
      } catch {
        // pkill exits non-zero when no matching process is running.
      }
      await waitForBackendState(false, 30000);
    }

    await startBackendRuntime();
  });

  test.afterAll(async () => {
    if (backendWasInitiallyUp) {
      await stopBackendRuntime().catch(() => {
        // If the managed runtime is already gone, continue with detached recovery.
      });
      spawnDetachedBackendRuntime();
      await waitForBackendState(true, 60000);
      return;
    }

    await waitForBackendState(true, 60000).catch(async () => {
      await startBackendRuntime();
    });
  });

  test("@workflow @mutable admin reports keeps operator truth visible during backend outage", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");

    await withBackendOutage(async () => {
      await page.goto("/admin/reports");
      await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
      await expect(page.getByText(/^load issue$/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /platform reports could not be loaded/i })).toBeVisible();
      await expect(page.getByText(/retry after backend check|try again soon/i)).toBeVisible();
    });
  });

  test("@workflow @mutable teacher exams keeps operator truth visible during backend outage", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");

    await withBackendOutage(async () => {
      await page.goto("/teacher/exams");
      await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
      await expect(page.getByText(/^load issue$/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /teacher exams could not be loaded/i })).toBeVisible();
      await expect(page.getByText(/retry after backend check|try again soon/i)).toBeVisible();
    });
  });

  test("@workflow @mutable institute economy keeps operator truth visible during backend outage", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");

    await withBackendOutage(async () => {
      await page.goto("/institute/economy");
      await expect(page).toHaveURL(/\/institute\/economy(?:\?.*)?$/);
      await expect(page.getByText(/^load issue$/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /economy visibility could not be loaded/i })).toBeVisible();
      await expect(page.getByText(/retry after backend check|try again soon/i)).toBeVisible();
    });
  });
});
