import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSharedLibraryQuotaEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_QUOTA",
);
const quotaSearchProbe = "QUOTA LOCK DEMO ::";

test.describe("Institute shared-library mutable quota exhausted flow", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSharedLibraryQuotaEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_QUOTA",
      "institute shared-library quota exhausted coverage",
    ),
  );

  test("@workflow @mutable institute admin sees deterministic quota exhausted shared-library state", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(quotaSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=QUOTA/);
    await expect(searchField).toHaveValue(quotaSearchProbe);
    await expect(page.getByText(/shared library intake/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();
    await expect(page.getByText(/current lane:\s*local question bank/i).first()).toBeVisible();
  });
});
