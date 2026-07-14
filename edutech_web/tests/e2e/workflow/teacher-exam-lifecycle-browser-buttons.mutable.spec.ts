import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const teacherCredentials = {
  username: "demo-teacher",
  password: "Demo@12345",
};

const mutableTeacherExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
);
const teacherApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateTimeLocalValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(values.length).toBeGreaterThan(0);
  await locator.selectOption(values[0]!);
  return values[0]!;
}

async function expectMessageInUrl(page: Page, pattern?: RegExp) {
  await expect(page).toHaveURL(/message=/);
  if (pattern) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

async function deleteTeacherExam(page: Page, examId: string) {
  try {
    const proxyResponse = await page.request.delete(`/api/teacher/exams/${examId}`, {
      timeout: 15000,
    });
    if (proxyResponse.ok()) {
      return;
    }
  } catch {
    // Fall back to direct backend cleanup.
  }

  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Teacher exam lifecycle browser coverage", () => {
  test.skip(
    !mutableTeacherExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
      "teacher exam lifecycle browser coverage",
    ),
  );

  test("@workflow @mutable teacher can open, edit, publish, and verify exam UI actions end-to-end", async ({
    page,
  }) => {
    test.setTimeout(420000);

    await loginWithCredentials(page, teacherCredentials, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Lifecycle ${uniqueSeed}`;
    const editedExamTitle = `${examTitle} Edited`;
    const examCode = `PW-TL-${uniqueSeed}`;
    const editedExamCode = `PW-TL-EDIT-${uniqueSeed}`;
    const sectionName = `Teacher Core Section ${uniqueSeed}`;
    const removableSectionName = `Teacher Remove Section ${uniqueSeed}`;
    const slotLabel = `Teacher Morning Slot ${uniqueSeed}`;
    const startAt = new Date(Date.now() + 10 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    let examId: string | null = null;

    try {
      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?message=/);
      await expect(
        page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}.*builder`, "i") }).first(),
      ).toBeVisible();

      const builderBaseUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = builderBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.getByRole("link", { name: /open delivery view/i }).click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}(?:\\?.*)?$`));
      const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();

      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(page).toHaveURL(new RegExp(`/teacher/results\\?exam=${examId}`));
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await page.goto(`/teacher/reviews?exam=${examId}`);
      await expect(page).toHaveURL(new RegExp(`/teacher/reviews\\?exam=${examId}`));
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();

      await page.goto(examDetailBaseUrl);
      await page.getByRole("link", { name: /continue setup|open builder/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));

      const subjectSelect = page.locator('select[name="subject"]').first();
      if ((await subjectSelect.inputValue()) === "") {
        await selectFirstNonEmptyOption(subjectSelect);
      }
      await page.locator('input[name="title"]').fill(editedExamTitle);
      await page.locator('input[name="code"]').fill(editedExamCode);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="duration_minutes"]').fill("60");
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.locator('textarea[name="description"]').fill("Teacher lifecycle browser coverage description.");
      await page.locator('textarea[name="instructions"]').fill("Read each question carefully before submitting.");
      await page.locator('select[name="access_mode"]').selectOption("slot_managed");
      await page.locator('input[name="daily_start_cap"]').fill("25");
      await page.locator('input[name="hourly_start_cap"]').fill("10");
      await page.locator('input[name="concurrent_active_attempt_cap"]').fill("5");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expectMessageInUrl(page, /exam settings updated/i);

      await page.goto(`${builderBaseUrl}?tab=sections`);
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expectMessageInUrl(page, /section added/i);

      await page.goto(`${builderBaseUrl}?tab=sections`);
      const addSectionForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByRole("button", { name: /^add section$/i }),
      }).first();
      await addSectionForm.getByRole("textbox", { name: /section name/i }).fill(removableSectionName);
      await addSectionForm.getByRole("spinbutton", { name: /total questions/i }).fill("0");
      await addSectionForm.getByRole("button", { name: /^add section$/i }).click();
      await expectMessageInUrl(page, /section added/i);
      const removableRow = page.locator(".builderListRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(removableSectionName), "i")),
      }).first();
      await removableRow.getByRole("button", { name: /^remove$/i }).click();
      await expectMessageInUrl(page, /section removed|deleted|updated/i);

      await page.goto(`${builderBaseUrl}?tab=questions`);
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const availableQuestionValue = await selectFirstNonEmptyOption(questionSelect);
      const selectedQuestionLabel = await questionSelect
        .locator(`option[value="${availableQuestionValue}"]`)
        .textContent();
      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      await selectFirstNonEmptyOption(sectionSelect);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /attach question/i }).click();
      await expectMessageInUrl(page, /question linked to exam/i);

      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("button", { name: /export as pdf/i }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState("domcontentloaded");
      await expect(popup.locator("h1")).toContainText(editedExamTitle);
      if (selectedQuestionLabel?.trim()) {
        const shortLabel = selectedQuestionLabel.split("·").pop()?.trim() ?? selectedQuestionLabel.trim();
        await expect(popup.locator("body")).toContainText(shortLabel.replace(/\.\.\.$/, ""));
      }
      await popup.close();

      const firstQuestionCard = page.locator(".builderQuestionCard").first();
      await firstQuestionCard.getByRole("spinbutton", { name: /^marks$/i }).fill("5");
      await firstQuestionCard.getByRole("spinbutton", { name: /negative marks/i }).fill("1");
      await firstQuestionCard.getByRole("button", { name: /save changes/i }).click();
      await expectMessageInUrl(page, /linked question updated|question link updated|updated/i);

      await page.goto(`${builderBaseUrl}?tab=assignment`);
      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");
      const studentCheckboxes = assignmentForm.locator('.selectionList input[type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      const hasAssignableStudents = studentCount > 0;
      if (studentCount > 0) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await studentCheckboxes.first().check();
      } else {
        await expect(
          page.getByText(/no learners match this search|no assignable students found/i).first(),
        ).toBeVisible();
      }
      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expectMessageInUrl(page, /student assignment updated|assignment updated|saved/i);

      const createSlotForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByRole("button", { name: /create slot/i }),
      }).first();
      await createSlotForm.locator('input[name="slot_label"]').fill(slotLabel);
      await createSlotForm.locator('input[name="slot_start_at"]').fill(toDateTimeLocalValue(startAt));
      await createSlotForm.locator('input[name="slot_end_at"]').fill(toDateTimeLocalValue(endAt));
      await createSlotForm.locator('input[name="assignment_capacity"]').fill("10");
      await createSlotForm.locator('input[name="start_capacity"]').fill("5");
      await createSlotForm.getByRole("button", { name: /create slot/i }).click();
      await expectMessageInUrl(page, /slot created|created/i);

      const slotCard = page.locator(".builderListCard").filter({
        has: page.locator(`input[name="slot_label"][value="${slotLabel}"]`),
      }).first();
      await expect(slotCard).toBeVisible();
      await slotCard.locator('input[name="grace_period_minutes"]').fill("20");
      await slotCard.getByRole("button", { name: /update slot/i }).click();
      await expectMessageInUrl(page, /slot updated|updated/i);

      await page.goto(`${builderBaseUrl}?tab=assignment&preview_scope=all_selected`);
      if (hasAssignableStudents) {
        await expect(page.getByRole("button", { name: /refresh preview/i })).toBeVisible();
        await expect(page.getByText(/automatic distribution preview|dry run/i).first()).toBeVisible();

        const bulkSlotForm = page.locator("form.builderForm.builderSubform").filter({
          has: page.getByRole("button", { name: /apply bulk slot/i }),
        }).first();
        await selectFirstNonEmptyOption(bulkSlotForm.locator('select[name="access_slot"]'));
        await bulkSlotForm.getByRole("button", { name: /apply bulk slot/i }).click();
        await expectMessageInUrl(page, /bulk student slot assignment saved|bulk slot|updated|applied/i);

        const overrideForm = page.locator("form.builderForm.builderSubform").filter({
          has: page.getByRole("button", { name: /save slot override/i }),
        }).first();
        await selectFirstNonEmptyOption(overrideForm.locator('select[name="access_slot"]'));
        await overrideForm.locator('input[name="notes"]').fill("Teacher lifecycle override note");
        await overrideForm.getByRole("button", { name: /save slot override/i }).click();
        await expectMessageInUrl(page, /override|updated|saved/i);
      } else {
        await expect(page.getByText(/overrides unlock in selected-student mode/i).first()).toBeVisible();
      }

      if (hasAssignableStudents) {
        const accommodationForm = page.locator(".builderAccommodationCard").first();
        await expect(accommodationForm).toBeVisible();
        await accommodationForm.locator('input[name="extra_time_minutes"]').fill("10");
        await accommodationForm.locator('textarea[name="notes"]').fill("Needs extra review time.");
        await accommodationForm.getByRole("button", { name: /save accommodation/i }).click();
        await expectMessageInUrl(page, /accommodation|support|saved/i);
      } else {
        await expect(page.getByText(/no students available for accommodation setup/i).first()).toBeVisible();
      }

      await page.goto(`${builderBaseUrl}?tab=bank`);
      await expect(page.getByText(/question bank window/i).first()).toBeVisible();
      await expect(page.getByText(/total available|revision queue|ready first/i).first()).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(editedExamTitle), "i") }).first(),
      ).toBeVisible();
      await expect(page.getByText(editedExamCode, { exact: true })).toBeVisible();
      await expect(page.getByText(/exam publish readiness/i).first()).toBeVisible();
      await expect(page.getByText(/result publish readiness/i).first()).toBeVisible();

      await page.locator('select[name="commercial_path"]').selectOption("subscription_only");
      await page.locator('input[name="star_cost"]').fill("0");
      await page.locator('input[name="entitlement_code"]').fill(`pw_teacher_lifecycle_${uniqueSeed}`);
      await page.locator('input[name="priority"]').fill("88");
      await page.getByRole("button", { name: /save access policy/i }).click();
      await expectMessageInUrl(page, /policy|access|saved/i);

      await page.goto(`/teacher/exams/${examId}`);
      await page.getByRole("button", { name: /refresh status/i }).click();
      await expectMessageInUrl(page, /completed successfully|status/i);

      await page.goto(`/teacher/exams/${examId}`);
      await page.getByRole("button", { name: /sync marks/i }).click();
      await expectMessageInUrl(page, /marks/i);

      await page.goto(`/teacher/exams/${examId}`);
      const publishButton = page.getByRole("button", { name: /publish exam|make exam available/i });
      if (await publishButton.isVisible().catch(() => false)) {
        await publishButton.click();
        if (hasAssignableStudents) {
          await expectMessageInUrl(page, /completed successfully|publish/i);
        } else {
          await expect(page).toHaveURL(/error=/);
          await expect(
            page.getByText(/must have at least one active student assignment before publishing/i).first(),
          ).toBeVisible();
        }
      }

      if (hasAssignableStudents) {
        await page.goto(`/teacher/exams/${examId}`);
        const markLiveButton = page.getByRole("button", { name: /mark live|start exam now/i });
        if (await markLiveButton.isVisible().catch(() => false)) {
          await markLiveButton.click();
          await expectMessageInUrl(page, /completed successfully|live/i);
        }
      }

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByText(/draft|scheduled|live|completed/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await deleteTeacherExam(page, examId).catch(() => null);
      }
    }
  });
});
