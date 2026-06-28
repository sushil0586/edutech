import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherSharedLibraryRequestEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const BLOCKED_MATCHABLE_PREFIX = "BLOCKED MATCHABLE DEMO :: ";
const DEMO_SHARED_LIBRARY_BLOCKED_CODE = "DEMO_SHARED_LIBRARY_BLOCKED";
const MATCHING_DEMO_PACKAGE_CODES = [
  "DEMO_SHARED_LIBRARY_ACCESS",
  "DEMO_SHARED_LIBRARY_BLOCKED",
  "DEMO_SHARED_LIBRARY_QUOTA",
  "DEMO_SHARED_LIBRARY_PAUSED_ONLY",
];

type SessionProfile = {
  institute?: string | null;
};

type MasterLibraryRow = {
  id: string;
  source_institute_code?: string;
  source_program_code?: string;
  source_subject_code?: string;
  question_text: string;
  has_access: boolean;
  access_availability: string;
  access_status?: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type QuestionBankPackageRow = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code?: string;
  code: string;
  ownership_type?: string;
};

type EntitlementRow = {
  id: string;
  institute?: string;
  institute_code: string;
  question_bank_package_code: string;
  subscription_plan: string | null;
  status: string;
};

type PaginatedResponse<T> = {
  results: T[];
};

type AcademicProgramRow = {
  id: string;
  code: string;
};

type AcademicSubjectRow = {
  id: string;
  code: string;
  program: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

function pickPublicHubPackageByCode(packages: QuestionBankPackageRow[], packageCode: string) {
  return (
    packages.find(
      (row) =>
        row.code === packageCode &&
        row.ownership_type === "platform" &&
        row.institute_code?.toUpperCase().startsWith("PUB"),
    ) ??
    packages.find((row) => row.code === packageCode && row.ownership_type === "platform") ??
    packages.find((row) => row.code === packageCode) ??
    null
  );
}

test.describe("Teacher shared-library mutable request flow", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherSharedLibraryRequestEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST",
      "teacher shared-library request coverage",
    ),
  );

  test("@workflow @mutable teacher can request access for a shared-library question with matching package coverage", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const requestableRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.matching_packages.length > 0 &&
          row.access_availability !== "quota_exhausted" &&
          row.access_status !== "requested" &&
          row.access_status !== "linked",
      ) ??
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX) &&
          !row.has_access &&
          row.matching_packages.length > 0 &&
          row.access_availability !== "quota_exhausted",
      ) ??
      masterLibraryBody.results?.find(
        (row) =>
          !row.has_access &&
          row.matching_packages.length > 0 &&
          row.access_availability !== "quota_exhausted",
      ) ?? null;

    if (!requestableRow) {
      test.skip(true, "No teacher-visible shared-library row is currently requestable with matching package coverage.");
    }

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const requestedQuestionText = requestableRow!.question_text.replace(/\s+/g, " ").trim();
    expect(requestedQuestionText).not.toBe("");
    const requestedSearchProbe = requestedQuestionText.slice(0, 60);

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(requestedSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=/);

    const requestableCard = sharedLibrarySection.locator(".questionBankCard").filter({
      hasText: requestedSearchProbe,
    }).first();
    await expect(requestableCard).toBeVisible();
    await expect(requestableCard.getByText(/matching packages:/i).first()).toBeVisible();
    const requestButton = requestableCard.getByRole("button", { name: /request access/i });
    await expect(requestButton).toBeVisible();

    const requestResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/teacher/question-bank/master-library/") &&
        response.url().includes("/request-access") &&
        response.request().method() === "POST",
    );

    await requestButton.click();
    const requestResponse = await requestResponsePromise;
    expect(requestResponse.ok()).toBe(true);

    await expect(page).toHaveURL(/\/teacher\/question-bank\?.*message=/);
    await expect(page.getByText(/shared question access request submitted\./i).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();
    await searchField.fill(requestedSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=/);

    const requestedCard = sharedLibrarySection.locator(".questionBankCard").filter({
      hasText: requestedSearchProbe,
    }).first();
    await expect(requestedCard).toBeVisible();
    await expect(requestedCard.getByText(/request pending/i).first()).toBeVisible();
    await expect(requestedCard.getByRole("button", { name: /request access/i })).toHaveCount(0);
  });

  test("@workflow @mutable teacher shared-library card becomes access-active after admin applies the matching package to the same institute", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    let requestableRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX) &&
          !row.has_access &&
          row.access_availability !== "quota_exhausted" &&
          row.access_status !== "requested" &&
          row.access_status !== "linked",
      ) ??
      masterLibraryBody.results?.find(
        (row) =>
          !row.has_access &&
          row.access_availability !== "quota_exhausted" &&
          row.access_status !== "requested" &&
          row.access_status !== "linked",
      ) ?? null;

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const packagesResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(packagesResponse.ok()).toBe(true);
    const packages = (await packagesResponse.json()) as QuestionBankPackageRow[];

    const uniqueSeed = Date.now();
    const planName = `Playwright Shared Access Bridge ${uniqueSeed}`;
    const planCode = `PW-SAB-${uniqueSeed}`;
    const temporaryPackageCode = `PW-TSPKG-${uniqueSeed}`;
    let createdPlanId: string | null = null;
    let createdEntitlementIds: string[] = [];
    let selectedQuestionText = "";
    let searchProbe = "";
    let targetPackageCode = "";
    const pausedEntitlements: Array<{ id: string; previousStatus: string }> = [];

    try {
      if (!requestableRow) {
        requestableRow =
          masterLibraryBody.results?.find(
            (row) =>
              row.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX) &&
              row.access_availability !== "quota_exhausted" &&
              row.access_status !== "requested" &&
              row.access_status !== "linked",
          ) ??
          masterLibraryBody.results?.find(
            (row) =>
              row.access_availability !== "quota_exhausted" &&
              row.access_status !== "requested" &&
              row.access_status !== "linked",
          ) ?? null;
      }

      if (!requestableRow) {
        test.skip(true, "No teacher shared-library question with matching package coverage is available.");
      }

      selectedQuestionText = requestableRow!.question_text.replace(/\s+/g, " ").trim();
      expect(selectedQuestionText).not.toBe("");
      searchProbe = selectedQuestionText.slice(0, 60);

      const targetPackageCodeFromRow =
        requestableRow!.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX)
          ? DEMO_SHARED_LIBRARY_BLOCKED_CODE
          : (requestableRow!.matching_packages.find((entry) => entry.code.trim().length > 0)?.code ?? "");
      expect(targetPackageCodeFromRow).not.toBe("");

      const targetPackage = pickPublicHubPackageByCode(packages, targetPackageCodeFromRow);
      expect(targetPackage).not.toBeNull();

      targetPackageCode = targetPackage!.code;

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
      const matchingActiveEntitlements = entitlements.filter(
        (row) =>
          row.institute === profile.institute &&
          MATCHING_DEMO_PACKAGE_CODES.includes(row.question_bank_package_code) &&
          row.status === "active",
      );

      for (const entitlement of matchingActiveEntitlements) {
        pausedEntitlements.push({ id: entitlement.id, previousStatus: entitlement.status });
        const pauseResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "revoked",
              notes: "Playwright teacher shared-library bridge setup.",
            },
          },
        );
        if (!pauseResponse.ok()) {
          continue;
        }
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank");
      const teacherSearchField = page.getByRole("textbox", { name: /search question text/i });
      await teacherSearchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const filteredSharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(filteredSharedLibrarySection).toBeVisible();

      const blockedCard = filteredSharedLibrarySection
        .locator(".questionBankCard")
        .filter({ hasText: searchProbe })
        .first();
      await expect(blockedCard).toBeVisible();
      await expect(blockedCard.getByText(/subscription required/i).first()).toBeVisible();
      await expect(blockedCard.getByRole("button", { name: /request access/i })).toHaveCount(0);

      await loginAsRole(page, "admin");
      expect(await getAccessToken(page)).not.toBe("");

      const createPlanResponse = await page.request.post(
        `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            institute: targetPackage!.institute,
            name: planName,
            code: planCode,
            description: "Playwright shared-library activation bridge coverage.",
            metadata: {},
            is_active: true,
            cycles: [
              {
                billing_interval: "monthly",
                interval_count: 1,
                price_amount: "0.00",
                currency: "INR",
                metadata: {},
                is_active: true,
                star_credit_rules: [],
              },
            ],
            question_bank_package_links: [
              {
                question_bank_package: targetPackage!.id,
                grant_mode: "included",
                is_default: true,
                metadata: {},
                is_active: true,
              },
            ],
          },
        },
      );
      expect(createPlanResponse.ok()).toBe(true);
      const createPlanBody = (await createPlanResponse.json()) as {
        data?: {
          id?: string;
          code?: string;
        };
      };
      createdPlanId = createPlanBody.data?.id ?? null;
      expect(createdPlanId).not.toBeNull();

      const applyPlanResponse = await page.request.post(
        `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${createdPlanId}/apply-to-institute/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            institute: profile.institute,
          },
        },
      );
      expect(applyPlanResponse.ok()).toBe(true);
      const applyPlanBody = (await applyPlanResponse.json()) as {
        data?: {
          entitlement_count?: number;
          question_bank_package_codes?: string[];
        };
      };
      expect(applyPlanBody.data?.entitlement_count ?? 0).toBeGreaterThan(0);
      expect(applyPlanBody.data?.question_bank_package_codes ?? []).toContain(targetPackageCode);

      const createdEntitlementsResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        },
      );
      expect(createdEntitlementsResponse.ok()).toBe(true);
      const createdEntitlements = (await createdEntitlementsResponse.json()) as EntitlementRow[];
      createdEntitlementIds = createdEntitlements
        .filter(
          (row) =>
            row.institute === profile.institute &&
            row.question_bank_package_code === targetPackageCode &&
            row.subscription_plan === createdPlanId &&
            row.status === "active",
        )
        .map((row) => row.id);
      expect(createdEntitlementIds.length).toBeGreaterThan(0);

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank");
      const activatedSearchField = page.getByRole("textbox", { name: /search question text/i });
      await activatedSearchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const activatedSharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(activatedSharedLibrarySection).toBeVisible();

      const activatedCard = activatedSharedLibrarySection
        .locator(".questionBankCard")
        .filter({ hasText: searchProbe })
        .first();
      await expect(activatedCard).toBeVisible();
      await expect(activatedCard.getByText(/access available/i).first()).toBeVisible();
      await expect(activatedCard.getByText(/scope mismatch/i)).toHaveCount(0);
      await expect(activatedCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
      await expect(activatedCard.getByRole("button", { name: /request access/i })).toBeVisible();
    } finally {
      if (createdEntitlementIds.length) {
        for (const entitlementId of createdEntitlementIds) {
          const revokeResponse = await page.request.patch(
            `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlementId}/`,
            {
              headers: {
                Authorization: `Bearer ${adminAccessToken}`,
                "Content-Type": "application/json",
              },
              data: {
                status: "revoked",
                notes: "Playwright shared-library activation bridge cleanup.",
              },
            },
          );
          if (!revokeResponse.ok()) {
            continue;
          }
        }
      }

      if (createdPlanId) {
        const deactivatePlanResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${createdPlanId}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              is_active: false,
            },
          },
        );
        if (!deactivatePlanResponse.ok()) {
          return;
        }
      }

      for (const entitlement of pausedEntitlements) {
        const restoreResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: entitlement.previousStatus,
              notes: "Playwright teacher shared-library bridge restore.",
            },
          },
        );
        if (!restoreResponse.ok()) {
          continue;
        }
      }
    }
  });
});
