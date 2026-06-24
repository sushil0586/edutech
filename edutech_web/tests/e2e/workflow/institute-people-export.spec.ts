import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectCsvDownload(
  page: Page,
  expectedFileName: string,
  expectedHeaderFragment: string,
) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export csv/i }).click();
  const download = await downloadPromise;
  await expectDownloadFile(download, expectedFileName, expectedHeaderFragment);
}

async function expectDownloadFile(
  download: Download,
  expectedFileName: string,
  expectedHeaderFragment: string,
) {
  const suggestedFileName = download.suggestedFilename();
  expect(suggestedFileName).toBe(expectedFileName);

  const filePath = await download.path();
  expect(filePath).not.toBeNull();

  const content = await readFile(filePath!, "utf8");
  expect(content.length).toBeGreaterThan(20);
  expect(content).toContain(expectedHeaderFragment);
}

test.describe("Institute people export downloads", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can export student and teacher rosters as CSV downloads", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/people?view=students");
    await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
    await expectCsvDownload(
      page,
      "students-roster.csv",
      '"Name","Admission No","Email","Phone","Cohort","Status","Login Ready","Username"',
    );

    await page.goto("/institute/people?view=teachers");
    await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
    await expectCsvDownload(
      page,
      "teachers-roster.csv",
      '"Name","Employee Code","Email","Phone","Specialization","Status","Login Ready","Username"',
    );
  });
});
