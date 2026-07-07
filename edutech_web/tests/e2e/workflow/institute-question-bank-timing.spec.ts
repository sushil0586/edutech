import { expect, test, type Locator, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  const firstValue = values[0] ?? null;
  expect(firstValue).not.toBeNull();
  await locator.selectOption(firstValue!);
}

async function expectQuestionBankLanding(page: Parameters<typeof test>[0]["page"]) {
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
  await expect(page.getByText(/find questions faster/i)).toBeVisible();
}

async function measureTiming(args: {
  action: () => Promise<void>;
  assertVisible: () => Promise<void>;
  label: string;
  metrics: TimingMetric[];
}) {
  const start = Date.now();
  await args.action();
  await args.assertVisible();
  args.metrics.push({
    label: args.label,
    elapsedMs: Date.now() - start,
  });
}

test.describe("Institute question bank timing", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute question bank route timing probe stays measurable", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await measureTiming({
      label: "question-bank-initial",
      metrics,
      action: async () => {
        await page.goto("/institute/question-bank", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expectQuestionBankLanding(page);
      },
    });

    const searchField = page.getByRole("textbox", { name: /search question text/i });

    await measureTiming({
      label: "question-bank-search-apply",
      metrics,
      action: async () => {
        await searchField.fill("square root");
        await page.getByRole("button", { name: /apply filters/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/search=square\+root|search=square%20root/);
        await expect(searchField).toHaveValue("square root");
      },
    });

    await measureTiming({
      label: "question-bank-empty-search",
      metrics,
      action: async () => {
        await searchField.fill("playwright-no-match-zzqv-1781");
        await page.getByRole("button", { name: /apply filters/i }).click();
      },
      assertVisible: async () => {
        await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /reset filters and show all questions/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "question-bank-reset",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /reset filters and show all questions/i }).first().click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
        await expectQuestionBankLanding(page);
      },
    });

    await measureTiming({
      label: "question-bank-import-open",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /import questions csv/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/question-bank\/import(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
      },
    });

    await measureTiming({
      label: "question-bank-create-open",
      metrics,
      action: async () => {
        await page.goto("/institute/question-bank", { waitUntil: "domcontentloaded" });
        await page.getByRole("link", { name: /create question/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/institute\/question-bank\/new(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
      },
    });

    const questionProgramSelect = page.locator('select[name="program"]');
    const questionSubjectSelect = page.locator('select[name="subject"]');

    await measureTiming({
      label: "question-create-program-select",
      metrics,
      action: async () => {
        await expect(questionSubjectSelect).toBeDisabled();
        await selectFirstNonEmptyOption(questionProgramSelect);
      },
      assertVisible: async () => {
        await expect(questionSubjectSelect).toBeEnabled();
      },
    });

    const payload = {
      route: "institute-question-bank",
      metrics,
    };
    await testInfo.attach("institute-question-bank-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("institute-question-bank-timing", JSON.stringify(payload));
  });
});
