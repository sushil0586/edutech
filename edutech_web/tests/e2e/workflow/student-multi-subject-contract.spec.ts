import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  fetchStudentExamDetailCatalog,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";
import { expectStudentWorkspace } from "../helpers/navigation";

const multiSubjectExamCode = "DMO-MIX-MOCK-01";
const expectedSectionNames = [
  "Mathematics Section",
  "Physics Section",
  "Chemistry Section",
];
const expectedSubjectNames = [
  "Mathematics",
  "Physics",
  "Chemistry",
];

test.describe("Student multi-subject exam contract", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student sees the seeded multi-subject mock as a true mixed-subject experience", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const mixedExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "multi-subject student mock",
      examCode: multiSubjectExamCode,
    });
    if (!mixedExam) {
      return;
    }
    expect(mixedExam!.is_multi_subject).toBe(true);
    expect(mixedExam!.subject_summary.subject_count).toBe(3);
    expect(mixedExam!.subject_summary.display_label).toBeTruthy();
    expect(mixedExam!.section_subjects.map((subject) => subject.name)).toEqual(expectedSubjectNames);

    const detail = await fetchStudentExamDetailCatalog(page, mixedExam!.id);
    expect(detail.code).toBe(multiSubjectExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect(detail.subject_summary.display_label).toBe(mixedExam!.subject_summary.display_label);
    expect(detail.section_subjects.map((subject) => subject.name)).toEqual(expectedSubjectNames);
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);

    await page.goto("/app/exams");
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.title).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${mixedExam!.id}`);
    await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
    await expect(page.getByText(mixedExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
