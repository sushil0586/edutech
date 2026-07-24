import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectFocusedElementToMatch(
  page: Parameters<typeof test>[0]["page"],
  matcher: {
    role?: string | null;
    hrefIncludes?: string | null;
    textPattern?: RegExp | null;
  },
) {
  await expect
    .poll(async () => {
      const value = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) {
          return null;
        }
        return {
          role: active.getAttribute("role"),
          href: active.getAttribute("href"),
          text: active.textContent?.replace(/\s+/g, " ").trim() ?? "",
          tag: active.tagName.toLowerCase(),
        };
      });
      if (!value) {
        return false;
      }
      if (matcher.hrefIncludes && !String(value.href ?? "").includes(matcher.hrefIncludes)) {
        return false;
      }
      if (matcher.role && String(value.role ?? "") !== matcher.role) {
        return false;
      }
      if (matcher.textPattern && !matcher.textPattern.test(String(value.text ?? ""))) {
        return false;
      }
      return true;
    })
    .toBe(true);
}

test.describe("Institute exam detail workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can open an exam detail route and inspect the core detail panels", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();

      await page.getByRole("link", { name: /quick create/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams\/new(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      return;
    }

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

    await expect(page.getByText(/^exam code$/i).first()).toBeVisible();
    await expect(page.getByText(/^questions$/i).first()).toBeVisible();
    await expect(page.getByText(/^assigned students$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();

    await expect(page.getByText(/^exam readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^hard blockers$/i).first()).toBeVisible();
    await expect(page.getByText(/^still pending$/i).first()).toBeVisible();
    await expect(page.getByText(/^already ready$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();

    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
    await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
  });

  test("@workflow institute exam detail keeps keyboard handoffs truthful from hero actions into delivery actions", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      return;
    }

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);
    await expect(page.getByText(/^delivery control$/i).first()).toBeVisible();

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/builder",
      textPattern: /continue setup|open builder/i,
    });

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "#exam-actions",
      textPattern: /jump to delivery actions/i,
    });

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#exam-actions$/);
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/results?exam=",
      textPattern: /open results/i,
    });

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/reviews?exam=",
      textPattern: /open reviews/i,
    });

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/question-bank",
      textPattern: /open question bank/i,
    });

    await page.locator("#exam-actions").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: /link questions/i }).first().focus();
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/builder?tab=questions",
      textPattern: /link questions/i,
    });

    await page.keyboard.press("Tab");
    await expectFocusedElementToMatch(page, {
      hrefIncludes: "/builder",
      textPattern: /continue setup|open builder/i,
    });

    const actionLabels = [
      /make exam available|start exam now|finish exam delivery/i,
      /refresh status/i,
      /sync marks/i,
      /disable key entry|enable key entry/i,
      /regenerate key/i,
    ];

    for (const label of actionLabels) {
      await page.keyboard.press("Tab");
      await expectFocusedElementToMatch(page, {
        textPattern: label,
      });
    }
  });
});
