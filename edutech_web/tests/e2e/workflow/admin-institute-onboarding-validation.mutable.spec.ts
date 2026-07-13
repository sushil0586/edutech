import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  createDisposableInstitute,
  deleteDisposableInstitute,
  fetchBackendRecords,
  getAdminAccessToken,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminOnboardingValidationEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);

type BackendInstituteRecord = {
  id: string;
  code: string;
  name: string;
};

async function openCreateDialog(page: Page) {
  await page.goto("/admin/institutes");
  await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /add institute/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /add institute/i })).toBeVisible();
  return dialog;
}

async function fillCreateDialog(
  page: Page,
  {
    instituteName,
    instituteCode,
    onboardingProfileCode,
  }: {
    instituteName: string;
    instituteCode: string;
    onboardingProfileCode?: string;
  },
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/institute name/i).fill(instituteName);
  await dialog.getByLabel(/^code$/i).fill(instituteCode);
  await dialog.getByLabel(/^email$/i).fill(`${instituteCode.toLowerCase()}@example.test`);
  await dialog.getByLabel(/^phone$/i).fill(`91${uniqueOnboardingSeed().slice(-8)}`);
  await dialog.getByLabel(/website/i).fill(`https://${instituteCode.toLowerCase()}.example.test`);
  await dialog.getByLabel(/description/i).fill(`Validation coverage for ${instituteCode}.`);
  if (onboardingProfileCode) {
    await dialog.getByRole("combobox", { name: /onboarding profile/i }).selectOption(onboardingProfileCode);
  }
}

test.describe("Admin onboarding validation", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingValidationEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
      "admin onboarding validation browser coverage",
    ),
  );

  test("@workflow @mutable @onboarding missing required institute fields block onboarding create in the browser", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const dialog = await openCreateDialog(page);
    await dialog.getByRole("button", { name: /save institute/i }).click();

    await expect(page.getByText(/fill the required fields to continue\./i)).toBeVisible();
    await expect(page.getByText(/institute name is required\./i)).toBeVisible();
    await expect(page.getByText(/institute code is required\./i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(dialog).toBeVisible();
  });

  test("@workflow @mutable @onboarding admin cannot create two institutes with the same code", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);

    const seed = uniqueOnboardingSeed();
    let instituteId: string | null = null;

    try {
      const existingInstitute = await createDisposableInstitute(page, {
        name: `PW Duplicate Source ${seed}`,
        code: `PWDUP${seed.slice(-5)}`,
      });
      instituteId = existingInstitute.id;

      await openCreateDialog(page);
      await fillCreateDialog(page, {
        instituteName: `PW Duplicate Attempt ${seed}`,
        instituteCode: existingInstitute.code,
        onboardingProfileCode: "SCHOOL_STARTER",
      });

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/institutes") &&
          response.request().method() === "POST",
      );
      await page.getByRole("dialog").getByRole("button", { name: /save institute/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBe(false);

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/institute could not be created\. review the highlighted fields\./i)).toBeVisible();
      await expect(page.getByText(/already exists/i)).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);

      const institutes = await fetchBackendRecords<BackendInstituteRecord>(
        page,
        accessToken,
        `/api/v1/institutes/?search=${encodeURIComponent(existingInstitute.code)}`,
      );
      expect(institutes.filter((row) => row.code === existingInstitute.code)).toHaveLength(1);
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test("@workflow @mutable @onboarding invalid onboarding profile code is rejected safely", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);

    const seed = uniqueOnboardingSeed();
    const instituteCode = `PWBAD${seed.slice(-5)}`;
    const invalidProfileCode = "BROKEN_PROFILE";

    await openCreateDialog(page);
    await fillCreateDialog(page, {
      instituteName: `PW Invalid Profile ${seed}`,
      instituteCode,
    });

    const profileSelect = page.getByRole("dialog").getByRole("combobox", { name: /onboarding profile/i });
    await profileSelect.evaluate((element, profileCode) => {
      const select = element as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = String(profileCode);
      option.text = `${profileCode} (${profileCode})`;
      select.appendChild(option);
      select.value = String(profileCode);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, invalidProfileCode);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/institutes") &&
        response.request().method() === "POST",
    );
    await page.getByRole("dialog").getByRole("button", { name: /save institute/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(false);

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/institute could not be created\. review the highlighted fields\./i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);

    const institutes = await fetchBackendRecords<BackendInstituteRecord>(
      page,
      accessToken,
      `/api/v1/institutes/?search=${encodeURIComponent(instituteCode)}`,
    );
    expect(institutes.filter((row) => row.code === instituteCode)).toHaveLength(0);
  });
});
