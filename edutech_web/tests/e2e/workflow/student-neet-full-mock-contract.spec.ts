import { expect, test } from "@playwright/test";
import {
  fetchStudentExamDetailCatalog,
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const neetExamCode = "DMO-NEET-FULL-01";
const expectedSectionNames = [
  "Physics Section",
  "Chemistry Section",
  "Biology Section",
];
const expectedSubjectNames = [
  "Physics",
  "Chemistry",
  "Biology",
];

test.describe("Student NEET full mock contract", () => {
  test("@workflow neet student sees the seeded NEET full mock as a serious mixed-subject competitive exam", async ({
    page,
  }) => {
    await loginStudentFamilyAccountOrSkip(page, neetStudentCredentials, "neet");

    const neetExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "NEET full mock",
      examCode: neetExamCode,
    });
    if (!neetExam) {
      return;
    }
    expect(neetExam!.is_multi_subject).toBe(true);
    expect(neetExam!.subject_summary.subject_count).toBe(3);
    expect([...neetExam!.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );

    const detail = await fetchStudentExamDetailCatalog(page, neetExam!.id);
    expect(detail.code).toBe(neetExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect([...detail.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("section");
    expect(detail.experience_profile.actual_navigation_mode).toBe("sequential");

    await page.goto("/app/exams");
    await expect(page.getByText(neetExam!.title).first()).toBeVisible();
    await expect(page.getByText(neetExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${neetExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(neetExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(neetExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    await expect(page.getByText(/180 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/review availability/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
