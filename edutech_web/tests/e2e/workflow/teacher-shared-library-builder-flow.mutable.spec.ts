import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherSharedLibraryBuilderEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_BUILDER_FLOW",
);
const teacherApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: ";

type SessionProfile = {
  institute?: string | null;
};

type MasterLibraryRow = {
  id: string;
  question_text: string;
  has_access: boolean;
  access_availability: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type EntitlementRow = {
  id: string;
  institute: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

async function findSeededLinkedInventoryCard(cards: Locator, questionPrefix: string) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasLinkedCopy =
      (await card.getByText(/read-only linked row/i).count()) > 0 ||
      (await card.getByText(/source state:\s*linked source/i).count()) > 0;

    if (hasLinkedCopy) {
      if (cardText.includes(questionPrefix)) {
        return card;
      }
      fallbackCard ??= card;
    }
  }

  return fallbackCard;
}

async function deleteTeacherExam(page: Page, examId: string) {
  const response = await page.request.delete(`/api/teacher/exams/${examId}`, {
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function restoreEntitlement(
  page: Page,
  accessToken: string,
  entitlementId: string,
  notes: string,
) {
  try {
    const response = await page.request.patch(
      `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlementId}/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: {
          status: "active",
          notes,
        },
        timeout: 15000,
      },
    );
    expect(response.ok()).toBe(true);
  } catch (error) {
    console.warn(
      `[teacher-shared-library-builder] restore entitlement failed id=${entitlementId}`,
      error,
    );
  }
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await expect(locator).toBeVisible();
  const values = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(values.length).toBeGreaterThan(0);
  await locator.selectOption(values[0]!);
  return values[0]!;
}

async function ensureWizardSubjectScope(page: Page) {
  const programSelect = page.locator('select[name="program"]').filter({ visible: true }).first();
  const subjectSelect = page.locator('select[name="subject"]').filter({ visible: true }).first();

  if ((await programSelect.count()) === 0 || (await subjectSelect.count()) === 0) {
    return;
  }

  const programValues = await programSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(programValues.length).toBeGreaterThan(0);

  for (const programValue of programValues) {
    await programSelect.selectOption(programValue);
    await expect.poll(async () => programSelect.inputValue()).toBe(programValue);
    await expect.poll(async () => subjectSelect.isDisabled().catch(() => true)).toBe(false);
    const subjectValues = await subjectSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    if (subjectValues.length > 0) {
      await subjectSelect.selectOption(subjectValues[0]!);
      await expect.poll(async () => subjectSelect.inputValue()).toBe(subjectValues[0]!);
      return;
    }
  }

  throw new Error("No visible exam wizard program exposed any selectable subject.");
}

async function selectFirstSectionSubject(page: Page) {
  const sectionSubjectSelect = page
    .locator("label.advancedBuilderField")
    .filter({ hasText: /section subject/i })
    .locator("select")
    .first();
  if ((await sectionSubjectSelect.count()) === 0) {
    return;
  }

  await expect(sectionSubjectSelect).toBeVisible();
  const firstValue = await sectionSubjectSelect.locator("option").evaluateAll((options) => {
    const match = options.find((option) => (option as HTMLOptionElement).value.trim().length > 0);
    return match ? (match as HTMLOptionElement).value : "";
  });
  expect(firstValue).not.toBe("");
  await sectionSubjectSelect.selectOption(firstValue);
}

test.describe("Teacher shared-library to builder flow", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("teacher") || testRequiresRole("admin"),
    "Teacher or admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherSharedLibraryBuilderEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_BUILDER_FLOW",
      "teacher shared-library builder coverage",
    ),
  );

  test("@workflow @mutable teacher builder blocks reusing a linked shared question after entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Shared Paused Exam ${uniqueSeed}`;
    const examCode = `PW-TSHARED-PAUSED-${uniqueSeed}`;
    const sectionName = `Teacher Paused Linked Section ${uniqueSeed}`;
    let examId: string | null = null;

    await page.goto(`/teacher/question-bank?search=${encodeURIComponent(PAUSED_ONLY_PREFIX)}`);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();

    const inventoryCards = inventorySection.locator(".questionBankCard");
    const linkedInventoryCard = await findSeededLinkedInventoryCard(inventoryCards, PAUSED_ONLY_PREFIX);

    if (!linkedInventoryCard) {
      test.skip(
        true,
        "No teacher-visible linked shared-library question is available in local inventory.",
      );
    }

    const linkedQuestionText =
      ((await linkedInventoryCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const linkedMasterRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.replace(/\s+/g, " ").trim() === linkedQuestionText &&
          row.has_access &&
          row.access_availability === "available" &&
          row.matching_packages.length > 0,
      ) ?? null;

    if (!linkedMasterRow) {
      test.skip(
        true,
        "Could not resolve the matching master-library row for the selected shared question.",
      );
    }

    const packageCodes = linkedMasterRow!.matching_packages
      .map((entry) => entry.code)
      .filter((code) => code.trim().length > 0);
    expect(packageCodes.length).toBeGreaterThan(0);

    await page.goto(`/teacher/question-bank?search=${encodeURIComponent(searchProbe)}`);
    await expect(page).toHaveURL(/search=/);

    await expect(
      inventorySection.locator(".questionBankCard").filter({ hasText: searchProbe }).first(),
    ).toBeVisible();

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const entitlementsResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
    const targetEntitlements = entitlements.filter(
      (row) =>
        row.institute === profile.institute &&
        packageCodes.includes(row.question_bank_package_code) &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${profile.institute} and package set ${packageCodes.join(", ")}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright teacher builder check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(searchProbe)}`);
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

      const pausedInventoryCard = page
        .locator("section.contentCard")
        .filter({ hasText: "Question inventory" })
        .first()
        .locator(".questionBankCard")
        .filter({ hasText: searchProbe })
        .first();
      await expect(pausedInventoryCard).toBeVisible();
      await expect(pausedInventoryCard.getByText(/source state:\s*linked source/i).first()).toBeVisible();
      await expect(pausedInventoryCard.getByText(/licensed source paused/i)).toBeVisible();
      await expect(pausedInventoryCard.getByText(/read-only linked/i).first()).toBeVisible();

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await ensureWizardSubjectScope(page);
      await page.getByRole("button", { name: /^continue$/i }).click();
      const examTypeField = page.locator('select[name="exam_type"]');
      if (await examTypeField.count()) {
        await examTypeField.selectOption("final_exam").catch(() => null);
      }
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));
      await page.getByRole("tab", { name: /sections/i }).click();
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await selectFirstSectionSubject(page);
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await page.getByRole("tab", { name: /linked questions/i }).click();
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
        (options, probe) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
        searchProbe,
      );

      if (!matchingQuestionOption) {
        await expect(questionSelect).toBeVisible();
        const optionLabels = await questionSelect.locator("option").evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).label),
        );
        expect(optionLabels.some((label) => label.includes(searchProbe))).toBe(false);
        return;
      }

      await questionSelect.selectOption(matchingQuestionOption.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();

      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();

      await expect(page).toHaveURL(/tab=questions&error=/);
      await expect(
        page.getByText(/no longer covered by the institute's active question-bank entitlements/i).first(),
      ).toBeVisible();
      await expect(
        page.locator(".builderQuestionCard").filter({ hasText: searchProbe }).first(),
      ).toHaveCount(0);
    } finally {
      for (const entitlement of targetEntitlements) {
        await restoreEntitlement(
          page,
          adminAccessToken,
          entitlement.id,
          "Playwright teacher builder check restored this entitlement.",
        );
      }

      if (examId) {
        await deleteTeacherExam(page, examId);
      }
    }
  });

  test("@workflow @mutable teacher builder blocks updates for an already-attached linked shared question after entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Shared Locked Update ${uniqueSeed}`;
    const examCode = `PW-TSHARED-LOCK-${uniqueSeed}`;
    const sectionName = `Teacher Locked Linked Section ${uniqueSeed}`;
    let examId: string | null = null;

    await page.goto(`/teacher/question-bank?search=${encodeURIComponent(PAUSED_ONLY_PREFIX)}`);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();

    const inventoryCards = inventorySection.locator(".questionBankCard");
    const linkedInventoryCard = await findSeededLinkedInventoryCard(inventoryCards, PAUSED_ONLY_PREFIX);

    if (!linkedInventoryCard) {
      test.skip(
        true,
        "No teacher-visible linked shared-library question is available in local inventory.",
      );
    }

    const linkedQuestionText =
      ((await linkedInventoryCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const linkedMasterRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.replace(/\s+/g, " ").trim() === linkedQuestionText &&
          row.has_access &&
          row.access_availability === "available" &&
          row.matching_packages.length > 0,
      ) ?? null;

    if (!linkedMasterRow) {
      test.skip(
        true,
        "Could not resolve the matching master-library row for the selected shared question.",
      );
    }

    const packageCodes = linkedMasterRow!.matching_packages
      .map((entry) => entry.code)
      .filter((code) => code.trim().length > 0);
    expect(packageCodes.length).toBeGreaterThan(0);

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
      await ensureWizardSubjectScope(page);
      await page.getByRole("button", { name: /^continue$/i }).click();
      const wizardExamTypeField = page.locator('select[name="exam_type"]');
      if (await wizardExamTypeField.count()) {
        await wizardExamTypeField.selectOption("final_exam").catch(() => null);
      }
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

    const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();
    const examIdMatch = examDetailBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
    examId = examIdMatch?.[1] ?? null;
    expect(examId).not.toBeNull();

    await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));
    await page.getByRole("tab", { name: /sections/i }).click();
    await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
    await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
    await selectFirstSectionSubject(page);
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(page).toHaveURL(/tab=sections&message=/);
    await page.getByRole("tab", { name: /linked questions/i }).click();

    const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
      has: page.getByText(/attach one question manually/i),
    }).first();
    const questionSelect = manualAttachForm.locator('select[name="question"]');
    const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
      (options, probe) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
      searchProbe,
    );
    if (!matchingQuestionOption) {
      const optionLabels = await questionSelect.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).label),
      );
      expect(optionLabels.some((label) => label.includes(searchProbe))).toBe(false);
      return;
    }
    await questionSelect.selectOption(matchingQuestionOption!.value);

    const sectionSelect = manualAttachForm.locator('select[name="section"]');
    const sectionOption = await sectionSelect.locator("option").evaluateAll(
      (options, targetSectionName) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .find((option) => option.label.trim() === targetSectionName) ?? null,
      sectionName,
    );
    expect(sectionOption).not.toBeNull();
    await sectionSelect.selectOption(sectionOption!.value);
    await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
    await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
    await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
    await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
    await expect(page).toHaveURL(/tab=questions&message=/);
    await expect(page.getByText(/question linked to exam/i)).toBeVisible();

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");
    const entitlementsResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
    const targetEntitlements = entitlements.filter(
      (row) =>
        row.institute === profile.institute &&
        packageCodes.includes(row.question_bank_package_code) &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${profile.institute} and package set ${packageCodes.join(", ")}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright teacher builder update check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.getByRole("tab", { name: /linked questions/i }).click();
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const linkedQuestionCard = page.locator(".builderQuestionCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(linkedQuestionCard).toBeVisible();
      await expect(linkedQuestionCard).toContainText(sectionName);

      const linkedQuestionForm = linkedQuestionCard.locator("form.builderQuestionEditorGrid");
      await linkedQuestionForm.getByRole("spinbutton", { name: /^marks$/i }).fill("6");
      await linkedQuestionForm.getByRole("spinbutton", { name: /negative marks/i }).fill("1");
      await linkedQuestionForm.getByRole("button", { name: /save changes/i }).click();

      await expect(page).toHaveURL(/tab=questions&error=/);
      await expect(
        page.getByText(/no longer covered by the institute's active question-bank entitlements/i).first(),
      ).toBeVisible();
      await expect(
        linkedQuestionCard.getByText(/4(\.00)? marks/i),
      ).toBeVisible();
      await expect(
        linkedQuestionCard.getByText(/0(\.00)? negative/i),
      ).toBeVisible();
    } finally {
      for (const entitlement of targetEntitlements) {
        await restoreEntitlement(
          page,
          adminAccessToken,
          entitlement.id,
          "Playwright teacher builder update check restored this entitlement.",
        );
      }

      if (examId) {
        await deleteTeacherExam(page, examId);
      }
    }
  });
});
