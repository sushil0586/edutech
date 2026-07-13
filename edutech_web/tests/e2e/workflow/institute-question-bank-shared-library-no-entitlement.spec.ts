import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const unentitledSearchProbe = "UNENTITLED DEMO ::";

type MasterLibraryRow = {
  id: string;
  question_text: string;
  has_access: boolean | null;
  has_entitlement: boolean | null;
  access_availability: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

test.describe("Institute shared-library no-entitlement workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute admin sees truthful blocked shared-library state when no matching package exists", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/?page_size=50&search=${encodeURIComponent(
        unentitledSearchProbe,
      )}`,
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
    const blockedRow =
      masterLibraryBody.results?.find((row) => row.question_text.includes(unentitledSearchProbe)) ?? null;

    expect(blockedRow).not.toBeNull();
    expect(blockedRow?.has_access).toBeFalsy();
    expect(blockedRow?.matching_packages ?? []).toHaveLength(0);
    expect(blockedRow?.access_availability).not.toBe("available");

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(unentitledSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=UNENTITLED/);
    await expect(searchField).toHaveValue(unentitledSearchProbe);
    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByText(/shared library intake/i).first()).toBeVisible();
    await expect(
      page.getByText(/use the topic-wise intake page to review available coverage, choose the right slices, and add platform questions/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();
  });
});
