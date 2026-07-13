import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  deleteDisposableInstitute,
  getAdminAccessToken,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminInstituteManagementModeEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
);

type BackendInstituteRecord = {
  id: string;
  code: string;
  name: string;
  management_mode: string;
};

async function fetchInstituteById(page: Page, accessToken: string, instituteId: string) {
  const response = await page.request.get(`http://127.0.0.1:9001/api/v1/institutes/${instituteId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as BackendInstituteRecord;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin institute management mode", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminInstituteManagementModeEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
      "admin institute management mode browser coverage",
    ),
  );

  test("@workflow @mutable admin can create and update institute management mode from the browser", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const accessToken = await getAdminAccessToken(page);

    const seed = uniqueOnboardingSeed();
    const instituteName = `PW Management Mode ${seed}`;
    const instituteCode = `PWMM${seed.slice(-5)}`;
    const instituteUpdatedName = `${instituteName} Updated`;
    const instituteUpdatedCode = `${instituteCode}U`;
    let instituteId: string | null = null;

    try {
      await page.goto("/admin/institutes");
      await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

      await page.getByRole("button", { name: /add institute/i }).click();
      const createDialog = page.getByRole("dialog");
      await createDialog.getByLabel(/institute name/i).fill(instituteName);
      await createDialog.getByLabel(/^code$/i).fill(instituteCode);
      await createDialog.getByLabel(/^email$/i).fill(`${instituteCode.toLowerCase()}@example.test`);
      await createDialog.getByLabel(/^phone$/i).fill(`91${seed.slice(-8)}`);
      await createDialog.getByLabel(/website/i).fill(`https://${instituteCode.toLowerCase()}.example.test`);
      await createDialog.getByRole("combobox", { name: /management mode/i }).selectOption(
        "public_institute_managed",
      );
      await createDialog.getByLabel(/description/i).fill("Management mode browser coverage.");

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/institutes") &&
          response.request().method() === "POST",
      );
      await createDialog.getByRole("button", { name: /save institute/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createdInstitute = (await createResponse.json()) as { id?: string };
      instituteId = createdInstitute.id ?? null;
      expect(instituteId).toBeTruthy();

      await page.goto(`/admin/institutes?institute=${instituteId}`);
      const detailCard = page.locator(".adminInstituteDetailCard").first();
      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteName), "i") }),
      ).toBeVisible();
      await expect(detailCard.getByText(/public institute managed/i).first()).toBeVisible();

      let backendInstitute = await fetchInstituteById(page, accessToken, instituteId!);
      expect(backendInstitute.management_mode).toBe(
        "public_institute_managed",
      );

      await page.getByRole("button", { name: /edit selected/i }).click();
      const editDialog = page.getByRole("dialog");
      await editDialog.getByLabel(/institute name/i).fill(instituteUpdatedName);
      await editDialog.getByLabel(/^code$/i).fill(instituteUpdatedCode);
      await editDialog.getByRole("combobox", { name: /management mode/i }).selectOption("platform_managed");

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${instituteId}`) &&
          response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /save institute/i }).click();
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.ok(), await patchResponse.text()).toBe(true);

      await expect(
        detailCard.getByRole("heading", { name: new RegExp(escapeRegExp(instituteUpdatedName), "i") }),
      ).toBeVisible();
      await expect(detailCard.getByText(/platform managed/i).first()).toBeVisible();

      backendInstitute = await fetchInstituteById(page, accessToken, instituteId!);
      expect(backendInstitute.management_mode).toBe(
        "platform_managed",
      );
    } finally {
      await deleteDisposableInstitute(page, instituteId);
    }
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow @mutable institute admin cannot change institute management mode", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "institute");
    const accessToken = await getAccessToken(page);
    const instituteId = await getInstituteIdFromSessionProfile(page);

    const before = await fetchInstituteById(page, accessToken, instituteId);

    const response = await page.request.patch(`http://127.0.0.1:9001/api/v1/institutes/${instituteId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        management_mode: "platform_managed",
      },
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.management_mode).toBeTruthy();

    const after = await fetchInstituteById(page, accessToken, instituteId);
    expect(after.management_mode).toBe(before.management_mode);
  });
});
