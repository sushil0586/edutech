import { expect, test, type Page } from "@playwright/test";
import { expectStudentWorkspace } from "../helpers/navigation";
import {
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyResultOrSkip,
} from "../helpers/student-family";

const families = [
  {
    label: "NEET",
    credentials: {
      username: "demo-neet-student",
      password: "Demo@12345",
    },
    resultExamCode: "DMO-NEET-RESULT-01",
  },
  {
    label: "JEE",
    credentials: {
      username: "demo-jee-student",
      password: "Demo@12345",
    },
    resultExamCode: "DMO-JEE-RESULT-01",
  },
] as const;

function resultRowByTitle(page: Page, title: string) {
  return page.locator(".studentResultsTableRow").filter({
    has: page.getByText(title, { exact: true }),
  }).first();
}

test.describe("Student family mobile results sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  for (const family of families) {
    test(`@workflow ${family.label} seeded result stays reachable on a mobile-sized viewport`, async ({
      page,
    }) => {
      await loginStudentFamilyAccountOrSkip(page, family.credentials, family.label);
      await expectStudentWorkspace(page);

      const familyResult = await resolveStudentFamilyResultOrSkip(page, {
        familyLabel: `${family.label} mobile result`,
        resultExamCode: family.resultExamCode,
      });
      if (!familyResult) {
        return;
      }

      await page.goto("/app/results");
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        page.locator(".studentWorkspaceFiltersCard, .studentResultsTable").first(),
      ).toBeVisible();

      const familyResultRow = resultRowByTitle(page, familyResult.exam_title);
      await expect(familyResultRow).toBeVisible();
      await expect(
        familyResultRow.getByText(/pending|pass|fail|published/i).first(),
      ).toBeVisible();

      await familyResultRow.click();
      const resultDialog = page.getByRole("dialog");
      await expect(resultDialog).toBeVisible();
      await expect(
        resultDialog.getByRole("link", { name: /open summary/i }).first(),
      ).toBeVisible();

      await resultDialog.getByRole("link", { name: /open summary/i }).first().click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/attempt summary/i).first()).toBeVisible();
      await expect(page.getByText(/attempt status/i).first()).toBeVisible();
      await expect(page.getByText(/what to do next|next step/i).first()).toBeVisible();

      const reviewLink = page.getByRole("link", { name: /open answer review|review feedback/i }).first();
      if (familyResult.review_available && (await reviewLink.isVisible().catch(() => false))) {
        await reviewLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
        const reviewModeHeading = page.getByText(/review mode/i).first();
        if (await reviewModeHeading.isVisible().catch(() => false)) {
          await expect(reviewModeHeading).toBeVisible();
        } else {
          await expect(
            page.getByText(/review not available|review unavailable/i).first(),
          ).toBeVisible();
          await expect(page.getByText(/check result visibility/i).first()).toBeVisible();
        }
      } else {
        await expect(page.getByText(/review locked|review not available/i).first()).toBeVisible();
      }
    });
  }
});
