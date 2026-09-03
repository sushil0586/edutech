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

test.describe("Institute shared-library package-truth workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute admin sees truthful shared-library package state for the current seeded probe", async ({
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
    const probedRow =
      masterLibraryBody.results?.find((row) => row.question_text.includes(unentitledSearchProbe)) ?? null;

    expect(probedRow).not.toBeNull();
    expect(probedRow?.has_access).toBeTruthy();
    expect(probedRow?.has_entitlement).toBeTruthy();
    expect(probedRow?.matching_packages?.length ?? 0).toBeGreaterThan(0);
    expect(probedRow?.access_availability).toBe("available");

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(unentitledSearchProbe);
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/search=UNENTITLED/);
    await expect(searchField).toHaveValue(unentitledSearchProbe);
    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();
    await expect(
      page.getByText(/use the linker only when the current bank is not enough and this institute needs additional platform-backed stock/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();
  });
});
