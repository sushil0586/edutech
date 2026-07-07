import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

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

test.describe("Admin people timing", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin people route timing probe stays measurable", async ({
    page,
  }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await measureTiming({
      label: "admin-people-students-open",
      metrics,
      action: async () => {
        await page.goto("/admin/people?view=students", { waitUntil: "domcontentloaded" });
      },
      assertVisible: async () => {
        await expect(page.getByRole("button", { name: /create student/i })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: /student roster and login management/i }).first(),
        ).toBeVisible();
        await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
      },
    });

    const instituteSelect = page.getByRole("combobox", { name: /select institute/i });
    if ((await instituteSelect.count()) > 0) {
      await page.getByRole("button", { name: /^open$/i }).click();
      await expect(page).toHaveURL(/\/admin\/people\?[^#]*institute=/);
    }

    await measureTiming({
      label: "admin-people-teachers-open",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /^teachers$/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/admin\/people\?[^#]*view=teachers/);
        await expect(page.getByRole("button", { name: /create teacher/i })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: /teacher roster and login management/i }).first(),
        ).toBeVisible();
      },
    });

    await measureTiming({
      label: "admin-people-students-return",
      metrics,
      action: async () => {
        await page.getByRole("link", { name: /^students$/i }).click();
      },
      assertVisible: async () => {
        await expect(page).toHaveURL(/\/admin\/people\?[^#]*view=students/);
        await expect(
          page.getByRole("heading", { name: /student roster and login management/i }).first(),
        ).toBeVisible();
      },
    });

    const payload = {
      route: "admin-people",
      metrics,
    };
    await testInfo.attach("admin-people-timing", {
      body: Buffer.from(JSON.stringify(payload, null, 2)),
      contentType: "application/json",
    });
    console.log("admin-people-timing", JSON.stringify(payload));
  });
});
