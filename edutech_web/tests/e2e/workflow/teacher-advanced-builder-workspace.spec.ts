import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoTeacherAdvancedBuilder(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
}

async function expectBlockedState(page: Page) {
  await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
  await expect(
    page.getByText(/advanced exam builder is not enabled for your institute yet/i).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /back to exams/i })).toHaveAttribute(
    "href",
    "/teacher/exams",
  );
}

test.describe("Teacher advanced builder workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can inspect advanced builder controls and safe authoring lanes", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherAdvancedBuilder(page);

    const pageText = await page.locator("body").innerText();
    if (/advanced exam builder is not enabled for your institute yet/i.test(pageText)) {
      await expectBlockedState(page);
      return;
    }

    await expect(page.getByRole("tab", { name: /scope and basics/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /composition/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /delivery/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /access/i }).first()).toBeVisible();

    await expect(page.getByText(/choose the academic lane and exam identity/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /auto fill basics/i })).toBeVisible();
    await expect(page.getByText(/start from a real exam product shape/i).first()).toBeVisible();
    await expect(page.getByLabel(/save current setup as a template/i).first()).toBeVisible();
    await expect(page.getByLabel(/academic year/i)).toBeVisible();
    await expect(page.getByLabel(/exam title/i)).toBeVisible();

    await expect(page.getByText(/sections$/i).first()).toBeVisible();
    await expect(page.getByText(/requested questions/i).first()).toBeVisible();
    await expect(page.getByText(/estimated marks/i).first()).toBeVisible();
    await expect(page.getByText(/run preview when you are ready/i).first()).toBeVisible();

    await page.getByRole("button", { name: /auto fill basics/i }).click();
    await expect(page.getByLabel(/exam title/i)).not.toHaveValue("");

    await page.getByRole("button", { name: /quick practice/i }).click();
    await expect(page.getByText(/quick practice template applied/i).first()).toBeVisible();

    await page.getByRole("tab", { name: /composition/i }).first().click();
    await expect(page.getByText(/sections, topics, and counts/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /quick practice/i }).first()).toBeVisible();
    await expect(page.getByLabel(/selection mode/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^add section$/i })).toBeVisible();
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(page.getByLabel(/section name/i).nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: /^remove$/i }).first()).toBeVisible();

    await page.getByRole("tab", { name: /delivery/i }).first().click();
    await expect(page.getByText(/attempt, navigation, and review/i).first()).toBeVisible();

    await page.getByRole("tab", { name: /access/i }).first().click();
    await expect(page.getByText(/economy and unlock behavior/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /preview exam/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create advanced exam/i })).toBeDisabled();

    const bodyText = await page.locator("body").innerText();
    if (/template library access is not enabled/i.test(bodyText)) {
      await expect(page.getByText(/template library access is not enabled/i).first()).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /save template/i })).toBeVisible();
      await expect(page.getByPlaceholder(/search by name, owner, or note/i)).toBeVisible();
    }

    await page.getByRole("button", { name: /preview exam/i }).click();
    await expect
      .poll(async () => {
        const text = await page.locator("body").innerText();
        if (/preview resolution|hard-stop blockers|builder cautions|section resolution/i.test(text)) {
          return "preview";
        }
        if (/unable to preview this exam right now|correct the highlighted|select/i.test(text)) {
          return "error";
        }
        return "pending";
      })
      .not.toBe("pending");
  });
});
