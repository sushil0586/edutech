import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSettingsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ACADEMIC_SETUP_ACTIONS",
);
const backendBaseUrl = resolveBackendBaseUrl();

type BackendInstituteRecord = {
  id: string;
  exam_defaults?: Record<string, unknown>;
};

function uniqueInstructions(seed: number) {
  return `Playwright settings persistence ${seed}`;
}

async function getAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

async function getInstituteIdFromSessionProfile(page: Page) {
  const encodedProfile =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_session_profile")?.value?.trim() ?? "";
  expect(encodedProfile).toBeTruthy();
  const profile = JSON.parse(decodeURIComponent(encodedProfile)) as { institute?: string | null };
  expect(profile.institute).toBeTruthy();
  return String(profile.institute);
}

async function fetchInstituteById(page: Page, accessToken: string, instituteId: string) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/institutes/${instituteId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as BackendInstituteRecord;
}

async function restoreInstituteDefaults(
  page: Page,
  accessToken: string,
  instituteId: string,
  examDefaults: Record<string, unknown>,
) {
  const response = await page.request.patch(`${backendBaseUrl}/api/v1/institutes/${instituteId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      exam_defaults: examDefaults,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Institute settings CRUD guardrails", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.skip(
    !mutableInstituteSettingsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ACADEMIC_SETUP_ACTIONS",
      "institute settings persistence browser coverage",
    ),
  );

  test("@workflow @mutable institute can validate, save, revisit, and restore exam defaults from settings", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const accessToken = await getAccessToken(page);
    const instituteId = await getInstituteIdFromSessionProfile(page);
    const backendInstitute = await fetchInstituteById(page, accessToken, instituteId);
    const originalExamDefaults = backendInstitute.exam_defaults ?? {};
    const seed = Date.now();
    const persistedInstructions = uniqueInstructions(seed);

    try {
      await page.goto("/institute/settings");
      await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
      await expect(page.getByText(/settings foundation is live/i).first()).toBeVisible();

      await page.getByRole("link", { name: /manage exam defaults/i }).click();
      await expect(page).toHaveURL(/\/institute\/academic-setup(?:\?.*)?$/);
      await page.getByRole("link", { name: /^exam defaults$/i }).click();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=exam-defaults/);
      await expect(page.getByLabel(/duration minutes/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /save defaults/i }).first()).toBeVisible();

      const durationInput = page.getByLabel(/duration minutes/i).first();
      const maxAttemptsInput = page.getByLabel(/max attempts/i).first();
      const timerModeSelect = page.getByLabel(/timer mode/i).first();
      const instructionsInput = page.getByLabel(/instructions/i).first();
      const allowLateSubmitCheckbox = page.getByLabel(/allow late submit/i).first();

      const originalDuration = (await durationInput.inputValue()).trim();
      const originalMaxAttempts = (await maxAttemptsInput.inputValue()).trim();
      const originalTimerMode = await timerModeSelect.inputValue();
      const originalAllowLateSubmit = await allowLateSubmitCheckbox.isChecked();

      await durationInput.fill("0");
      await maxAttemptsInput.fill("0");
      await page.getByRole("button", { name: /save defaults/i }).click();
      await expect(page.getByText(/correct the highlighted defaults to continue/i).first()).toBeVisible();
      await expect(page.getByText(/duration must be greater than zero/i).first()).toBeVisible();
      await expect(page.getByText(/max attempts must be greater than zero/i).first()).toBeVisible();

      await durationInput.fill(originalDuration && Number(originalDuration) > 0 ? String(Number(originalDuration) + 5) : "75");
      await maxAttemptsInput.fill(originalMaxAttempts && Number(originalMaxAttempts) > 0 ? originalMaxAttempts : "2");
      await timerModeSelect.selectOption(originalTimerMode === "global" ? "section" : "global");
      await instructionsInput.fill(persistedInstructions);
      if (originalAllowLateSubmit) {
        await allowLateSubmitCheckbox.uncheck();
      } else {
        await allowLateSubmitCheckbox.check();
      }

      const saveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/institute/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: /save defaults/i }).click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok(), await saveResponse.text()).toBe(true);
      await expect(page.getByText(/institute exam defaults updated successfully/i).first()).toBeVisible();

      await page.reload();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=exam-defaults/);
      await expect(instructionsInput).toHaveValue(persistedInstructions);
      await expect(durationInput).not.toHaveValue("0");
      await expect(maxAttemptsInput).not.toHaveValue("0");
      await expect(timerModeSelect).not.toHaveValue(originalTimerMode);
      await expect(allowLateSubmitCheckbox).toHaveJSProperty("checked", !originalAllowLateSubmit);

      await page.goto("/institute/settings");
      await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
      const heroSummaryText =
        (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
      const defaultsCardText =
        (await page
          .locator(".resultsSummaryGrid .metricCard")
          .filter({ has: page.getByText(/^exam defaults$/i) })
          .locator("strong")
          .textContent()) ?? "";
      const heroCount = Number(heroSummaryText.match(/(\d+)\s+exam default fields/i)?.[1] ?? "");
      const cardCount = Number(defaultsCardText.match(/(\d+)/)?.[1] ?? "");
      expect(Number.isFinite(heroCount)).toBe(true);
      expect(Number.isFinite(cardCount)).toBe(true);
      expect(heroCount).toBe(cardCount);
      expect(heroCount).toBeGreaterThan(0);
    } finally {
      await restoreInstituteDefaults(page, accessToken, instituteId, originalExamDefaults);
    }
  });
});
