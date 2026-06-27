import { expect, test } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

test.describe("Student mutable exam detail blocked-state flow", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "disposable student exam-detail blocked-state coverage",
    ),
  );

  test("@workflow @mutable student sees truthful upcoming guidance on exam detail before the window opens", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() + 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          studentDisplayName = renderedName;
        }
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Upcoming ${uniqueSeed}`;
      const examCode = `PW-DU-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(studentDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/this .* has been assigned, but the window is not open yet/i).first()).toBeVisible();
      await expect(
        page.getByText(/assigned to you, but its scheduled start window has not opened yet/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/check the availability window before trying again/i).first()).toBeVisible();
      await expect(page.getByText(/attempts left/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /not available yet/i })).toBeDisabled();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open review/i })).toHaveCount(0);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable student sees truthful closed-window guidance on exam detail after the window ends", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          studentDisplayName = renderedName;
        }
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Closed ${uniqueSeed}`;
      const examCode = `PW-DC-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(studentDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/this .* window has closed/i).first()).toBeVisible();
      await expect(
        page.getByText(/the active window for this .* is over/i).first(),
      ).toBeVisible();
      await expect(
        page.getByText(/blocked or completed states are controlled by backend assignment and lifecycle rules/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/attempts left/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /not available yet/i })).toBeDisabled();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open review/i })).toHaveCount(0);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable student sees star-locked guidance and wallet handoff on exam detail", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const starCost = "7";

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          studentDisplayName = renderedName;
        }
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Stars ${uniqueSeed}`;
      const examCode = `PW-DS-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(studentDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const accessPolicySelect = page.getByRole("combobox", { name: /access policy/i });
      const starOption = await accessPolicySelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            label: option.textContent?.trim() ?? "",
            value: (option as HTMLOptionElement).value,
          }))
          .find(
            (option) =>
              /star/i.test(option.label) &&
              !/either/i.test(option.label),
          ) ?? null,
      );
      expect(starOption).not.toBeNull();
      await accessPolicySelect.selectOption(starOption!.value);
      await page.getByRole("spinbutton", { name: /star cost/i }).fill(starCost);
      await page.getByRole("textbox", { name: /entitlement code/i }).fill("");
      await page.getByRole("button", { name: /save access policy/i }).click();
      await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByText(/unlock this .* before starting/i).first()).toBeVisible();
      await expect(
        page.getByText(new RegExp(`${starCost} stars are required before this .* can be started`, "i")).first(),
      ).toBeVisible();
      await expect(page.getByText(/unlock happens before any attempt can begin/i).first()).toBeVisible();
      await expect(page.getByText(/once unlocked, you return to this same detail page/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: new RegExp(`unlock with ${starCost} stars`, "i") })).toBeVisible();
      await expect(page.getByRole("link", { name: /open wallet/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);

      await page.getByRole("link", { name: /open wallet/i }).click();
      await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
