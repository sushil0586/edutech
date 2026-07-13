import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSharedLibraryEntitlementEnforcementEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT",
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

type MasterLibraryRow = {
  id: string;
  question_text: string;
  source_program_code: string;
  source_subject_code: string;
  source_topic_code: string | null;
  has_access: boolean;
  has_entitlement: boolean;
  access_availability: string;
  access_status: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type EntitlementRow = {
  id: string;
  institute_code: string;
  question_bank_package_code: string;
  granted_via: string;
  status: string;
};

type LookupProgram = {
  id: string;
  code: string;
  name: string;
};

type LookupSubject = {
  id: string;
  code: string;
  name: string;
};

type LookupTopic = {
  id: string;
  code: string;
  name: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

function buildQuestionBankUrl(
  path: string,
  params: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

test.describe("Institute shared-library entitlement enforcement", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("admin"),
    "Institute or admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSharedLibraryEntitlementEnforcementEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT",
      "institute shared-library entitlement enforcement coverage",
    ),
  );

  test("@workflow @mutable institute shared-library availability turns blocked when the matching subscription entitlement is paused", async ({
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

    const instituteResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/institutes/${profile.institute}/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(instituteResponse.ok()).toBe(true);
    const institute = (await instituteResponse.json()) as InstituteRecord;
    expect(institute.code).toBeTruthy();

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as {
      results?: MasterLibraryRow[];
    };
    const candidateRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.has_access &&
          row.has_entitlement &&
          row.access_availability === "available" &&
          row.matching_packages.length === 1 &&
          row.access_status !== "linked" &&
          row.access_status !== "requested" &&
          Boolean(row.source_program_code) &&
          Boolean(row.source_subject_code),
      ) ?? null;

    if (!candidateRow) {
      test.skip(
        true,
        "No institute-visible shared-library question currently has exactly one active matching package.",
      );
    }

    const packageCode = candidateRow!.matching_packages[0]?.code ?? "";
    const searchProbe = candidateRow!.question_text.slice(0, 60);
    expect(packageCode).not.toBe("");
    expect(searchProbe).not.toBe("");

    await loginAsRole(page, "admin");

    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

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
    const targetEntitlements = entitlements.filter(
      (row) =>
        row.institute_code === institute.code &&
        row.question_bank_package_code === packageCode &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${institute.code} and package ${packageCode}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright enforcement check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const [programsResponse, subjectsResponse] = await Promise.all([
        page.request.get(`${backendBaseUrl}/api/v1/academics/programs/?is_active=true&page_size=500`, {
          headers: {
            Authorization: `Bearer ${instituteAccessToken}`,
          },
        }),
        page.request.get(
          `${backendBaseUrl}/api/v1/academics/subjects/?is_active=true&page_size=500`,
          {
            headers: {
              Authorization: `Bearer ${instituteAccessToken}`,
            },
          },
        ),
      ]);
      expect(programsResponse.ok()).toBe(true);
      expect(subjectsResponse.ok()).toBe(true);

      const programsBody = (await programsResponse.json()) as { results?: LookupProgram[] };
      const subjectsBody = (await subjectsResponse.json()) as { results?: LookupSubject[] };
      const localProgram =
        programsBody.results?.find((row) => row.code === candidateRow!.source_program_code) ?? null;
      const localSubject =
        subjectsBody.results?.find((row) => row.code === candidateRow!.source_subject_code) ?? null;

      if (!localProgram || !localSubject) {
        test.skip(
          true,
          `No local institute program/subject matched ${candidateRow!.source_program_code}/${candidateRow!.source_subject_code}.`,
        );
      }

      let localTopic: LookupTopic | null = null;
      if (candidateRow!.source_topic_code) {
        const topicsResponse = await page.request.get(
          `${backendBaseUrl}/api/v1/academics/topics/?is_active=true&page_size=500&subject=${localSubject!.id}`,
          {
            headers: {
              Authorization: `Bearer ${instituteAccessToken}`,
            },
          },
        );
        expect(topicsResponse.ok()).toBe(true);
        const topicsBody = (await topicsResponse.json()) as { results?: LookupTopic[] };
        localTopic =
          topicsBody.results?.find((row) => row.code === candidateRow!.source_topic_code) ?? null;
      }

      const pausedMasterLibraryResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/question-bank/master-library/?page_size=100&search=${encodeURIComponent(
          searchProbe,
        )}&subject_code=${encodeURIComponent(candidateRow!.source_subject_code)}${
          candidateRow!.source_topic_code
            ? `&topic_code=${encodeURIComponent(candidateRow!.source_topic_code)}`
            : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${instituteAccessToken}`,
          },
        },
      );
      expect(pausedMasterLibraryResponse.ok()).toBe(true);
      const pausedMasterLibraryBody = (await pausedMasterLibraryResponse.json()) as {
        results?: MasterLibraryRow[];
      };
      const pausedRow =
        pausedMasterLibraryBody.results?.find((row) => row.id === candidateRow!.id) ?? null;

      expect(pausedRow).not.toBeNull();
      expect(pausedRow?.has_access).toBeFalsy();
      expect(pausedRow?.access_availability).not.toBe("available");

      await page.goto(
        buildQuestionBankUrl("/institute/question-bank", {
          program: localProgram!.id,
          subject: localSubject!.id,
          topic: localTopic?.id ?? undefined,
          search: searchProbe,
        }),
      );
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
      await expect(page).toHaveURL(/search=/);
      await expect(page.getByText(/why questions are or are not visible/i).first()).toBeVisible();
      await expect(page.getByText(/shared library intake/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();

      await page.goto(
        buildQuestionBankUrl("/institute/question-bank/library-linker", {
          program: localProgram!.id,
          subject: localSubject!.id,
          topic: localTopic?.id ?? undefined,
          search: searchProbe,
        }),
      );
      await expect(page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
      await expect(page.getByText(/current lane:\s*shared library linker/i).first()).toBeVisible();
      await expect(page.getByRole("textbox", { name: /search current topic/i })).toHaveValue(searchProbe);
      await expect(page.getByText(/step 3\.\s*review and link platform source questions/i).first()).toBeVisible();
      await expect(page.locator(".questionBankCard").filter({ hasText: searchProbe })).toHaveCount(0);
      await expect(page.getByText(/no platform questions matched this search/i).first()).toBeVisible();
      await expect(
        page.getByText(
          /try clearing the search box or reviewing the same topic without text filtering first/i,
        ).first(),
      ).toBeVisible();
    } finally {
      for (const entitlement of targetEntitlements) {
        const reactivateResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "active",
              notes: "Playwright enforcement check restored this entitlement.",
            },
          },
        );
        expect(reactivateResponse.ok()).toBe(true);
      }
    }
  });
});
