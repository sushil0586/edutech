import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSharedLibraryLinkEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_LINK",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const BLOCKED_MATCHABLE_PREFIX = "BLOCKED MATCHABLE DEMO :: ";
const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: ";

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

async function findLinkableSharedLibraryCard(cards: Locator) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const hasLinkButton = (await card.getByRole("button", { name: /link to local bank/i }).count()) > 0;

    if (hasLinkButton) {
      const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (cardText.includes(PAUSED_ONLY_PREFIX)) {
        return card;
      }
      fallbackCard ??= card;
    }
  }

  return fallbackCard;
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

test.describe("Institute shared-library mutable link flow", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSharedLibraryLinkEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_LINK",
      "institute shared-library link coverage",
    ),
  );

  test("@workflow @mutable institute can link an accessible shared-library question into the local bank", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const sharedLibraryCards = sharedLibrarySection.locator(".questionBankCard");
    const linkableCard = await findLinkableSharedLibraryCard(sharedLibraryCards);

    if (!linkableCard) {
      test.skip(
        true,
        "No institute-visible shared-library card currently exposes Link to Local Bank.",
      );
    }

    const linkedQuestionText =
      ((await linkableCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");

    const linkResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/teacher/question-bank/master-library/") &&
        response.url().includes("/link") &&
        response.request().method() === "POST",
    );

    await linkableCard!.getByRole("button", { name: /link to local bank/i }).click();
    const linkResponse = await linkResponsePromise;
    expect(linkResponse.ok()).toBe(true);

    await expect(page).toHaveURL(/\/institute\/question-bank\?.*message=/);
    await expect(page.getByText(/shared question linked into the local bank\./i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const searchProbe = linkedQuestionText.slice(0, 60);
    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(searchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(searchField).toHaveValue(searchProbe);
    await expect(page).toHaveURL(/search=/);

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();

    const linkedInventoryCard = inventorySection.locator(".questionBankCard").filter({
      hasText: searchProbe,
    }).first();
    await expect(linkedInventoryCard).toBeVisible();
    await expect(linkedInventoryCard.getByText(/linked source/i).first()).toBeVisible();
    await expect(linkedInventoryCard.getByText(/linked licensed copy/i).first()).toBeVisible();
    await expect(linkedInventoryCard.getByText(/read-only linked/i).first()).toBeVisible();
    await expect(linkedInventoryCard.getByText(/duplicate before editing/i).first()).toBeVisible();
    await expect(
      linkedInventoryCard.getByRole("link", { name: /duplicate to edit/i }),
    ).toBeVisible();
  });

  test("@workflow @mutable institute shared-library card becomes linkable after admin applies the matching package to the same institute", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    let blockedRow =
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

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

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
    const planName = `Playwright Institute Shared Access Bridge ${uniqueSeed}`;
    const planCode = `PW-ISAB-${uniqueSeed}`;
    let createdPlanId: string | null = null;
    let createdEntitlementIds: string[] = [];
    let selectedQuestionText = "";
    let targetPackageCode = "";
    let searchProbe = "";
    const pausedEntitlements: Array<{ id: string; previousStatus: string }> = [];

    try {
      if (!blockedRow) {
        blockedRow =
          masterLibraryBody.results?.find(
            (row) =>
              row.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX) &&
              row.matching_packages.length > 0 &&
              row.access_availability !== "quota_exhausted",
          ) ??
          masterLibraryBody.results?.find(
            (row) => row.matching_packages.length > 0 && row.access_availability !== "quota_exhausted",
          ) ?? null;
      }

      if (!blockedRow) {
        test.skip(true, "No institute shared-library question with matching package coverage is available.");
      }

      selectedQuestionText = blockedRow!.question_text.replace(/\s+/g, " ").trim();
      searchProbe = selectedQuestionText.slice(0, 60);
      expect(searchProbe).not.toBe("");

      const initialPackageCodes = blockedRow!.matching_packages
        .map((entry) => entry.code)
        .filter((code) => code.trim().length > 0);
      expect(initialPackageCodes.length).toBeGreaterThan(0);

      const targetPackage = pickPublicHubPackageByCode(packages, initialPackageCodes[0] ?? "");
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
          initialPackageCodes.includes(row.question_bank_package_code) &&
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
              notes: "Playwright institute shared-library bridge setup.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto("/institute/question-bank");
      const searchField = page.getByRole("textbox", { name: /search question text/i });
      await searchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const sharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(sharedLibrarySection).toBeVisible();

      const blockedCard = sharedLibrarySection.locator(".questionBankCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(blockedCard).toBeVisible();
      await expect(blockedCard.getByText(/subscription required/i).first()).toBeVisible();
      await expect(blockedCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);

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
            description: "Playwright institute shared-library activation bridge coverage.",
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

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/question-bank");
      const refreshedSearchField = page.getByRole("textbox", { name: /search question text/i });
      await refreshedSearchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const refreshedSharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(refreshedSharedLibrarySection).toBeVisible();

      const activatedCard = refreshedSharedLibrarySection.locator(".questionBankCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(activatedCard).toBeVisible();
      await expect(activatedCard.getByRole("button", { name: /link to local bank/i })).toBeVisible();
      await expect(activatedCard.getByText(/subscription required/i)).toHaveCount(0);
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
                notes: "Playwright institute shared-library activation bridge cleanup.",
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
              notes: "Playwright institute shared-library bridge restore.",
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
