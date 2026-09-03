import { expect, test } from "@playwright/test";
import {
  fetchStudentExamDetailCatalog,
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const jeeExamCode = "DMO-JEE-FULL-01";
const expectedSectionNames = [
  "Physics Objective",
  "Physics Numeric",
  "Chemistry Objective",
  "Chemistry Numeric",
  "Mathematics Objective",
  "Mathematics Numeric",
];
const expectedSubjectNames = [
  "Physics",
  "Chemistry",
  "Mathematics",
];

test.describe("Student JEE full mock contract", () => {
  test("@workflow jee student sees the seeded JEE full mock as a hybrid mixed-subject competitive exam", async ({
    page,
  }) => {
    await loginStudentFamilyAccountOrSkip(page, jeeStudentCredentials, "jee");

    const jeeExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "JEE full mock",
      examCode: jeeExamCode,
    });
    if (!jeeExam) {
      return;
    }
    expect(jeeExam!.is_multi_subject).toBe(true);
    expect(jeeExam!.subject_summary.subject_count).toBe(3);
    expect([...jeeExam!.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );

    const detail = await fetchStudentExamDetailCatalog(page, jeeExam!.id);
    expect(detail.code).toBe(jeeExamCode);
    expect(detail.is_multi_subject).toBe(true);
    expect(detail.subject_summary.subject_count).toBe(3);
    expect([...detail.section_subjects.map((subject) => subject.name)].sort()).toEqual(
      [...expectedSubjectNames].sort(),
    );
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("hybrid");
    expect(detail.experience_profile.actual_navigation_mode).toBe("hybrid");

    await page.goto("/app/exams");
    await expect(page.getByText(jeeExam!.title).first()).toBeVisible();
    await expect(page.getByText(jeeExam!.subject_summary.display_label).first()).toBeVisible();

    await page.goto(`/app/exams/${jeeExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(jeeExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(jeeExam!.subject_summary.display_label).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    await expect(page.getByText(/180 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/hybrid/i).first()).toBeVisible();

    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
