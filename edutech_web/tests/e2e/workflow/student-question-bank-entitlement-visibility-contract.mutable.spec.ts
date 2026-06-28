import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableStudentExamVisibilityContractEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_VISIBILITY_ENTITLEMENT_CONTRACT",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type SessionProfile = {
  institute?: string | null;
};

type InstituteRecord = {
  id: string;
  code: string;
  name: string;
};

type StudentExamRow = {
  id: string;
  code: string;
  title: string;
  source_type?: string | null;
};

type EntitlementRow = {
  id: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function fetchAvailableExamCodes(page: Page, accessToken: string, source?: string) {
  const query = source ? `?source=${encodeURIComponent(source)}` : "";
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as StudentExamRow[];
  return [...new Set(payload.map((item) => item.code).filter((value) => value.trim().length > 0))].sort();
}

test.describe("Student exam discovery contract against question-bank entitlement changes", () => {
  test.skip(
    testRequiresRole("student") || testRequiresRole("admin"),
    "Student or admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableStudentExamVisibilityContractEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_VISIBILITY_ENTITLEMENT_CONTRACT",
      "student exam discovery contract coverage against entitlement changes",
    ),
  );

  test("@workflow @mutable student exam discovery remains unchanged when an institute question-bank entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const studentAccessToken = await getAccessToken(page);
    expect(studentAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${studentAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const beforeAllCodes = await fetchAvailableExamCodes(page, studentAccessToken);
    const beforePlatformCodes = await fetchAvailableExamCodes(page, studentAccessToken, "platform");
    const beforeInstituteCodes = await fetchAvailableExamCodes(page, studentAccessToken, "institute");

    expect(beforeAllCodes.length).toBeGreaterThan(0);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const instituteResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/institutes/${profile.institute}/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(instituteResponse.ok()).toBe(true);
    const institute = (await instituteResponse.json()) as InstituteRecord;
    expect(institute.code).toBeTruthy();

    const entitlementsResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
    const targetEntitlement =
      entitlements.find(
        (row) => row.institute_code === institute.code && row.status === "active",
      ) ?? null;

    if (!targetEntitlement) {
      test.skip(true, `No active question-bank entitlement was available for institute ${institute.code}.`);
    }

    try {
      const pauseResponse = await page.request.patch(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${targetEntitlement!.id}/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            status: "paused",
            notes: "Playwright student exam-discovery visibility contract paused this entitlement temporarily.",
          },
        },
      );
      expect(pauseResponse.ok()).toBe(true);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const refreshedStudentAccessToken = await getAccessToken(page);
      expect(refreshedStudentAccessToken).not.toBe("");

      const afterAllCodes = await fetchAvailableExamCodes(page, refreshedStudentAccessToken);
      const afterPlatformCodes = await fetchAvailableExamCodes(page, refreshedStudentAccessToken, "platform");
      const afterInstituteCodes = await fetchAvailableExamCodes(page, refreshedStudentAccessToken, "institute");

      expect(afterAllCodes).toEqual(beforeAllCodes);
      expect(afterPlatformCodes).toEqual(beforePlatformCodes);
      expect(afterInstituteCodes).toEqual(beforeInstituteCodes);

      await page.goto("/app/exams?source=platform");
      await expect(page).toHaveURL(/\/app\/exams\?source=platform/);
      await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
      await expect(page.getByText(/source view .* platform/i).first()).toBeVisible();
    } finally {
      const reactivateResponse = await page.request.patch(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${targetEntitlement!.id}/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            status: "active",
            notes: "Playwright student exam-discovery visibility contract restored this entitlement.",
          },
        },
      );
      expect(reactivateResponse.ok()).toBe(true);
    }
  });
});
