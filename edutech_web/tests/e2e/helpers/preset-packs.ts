import { expect, type Page } from "@playwright/test";

export type ExamPresetPackPayload = {
  id: string;
  label: string;
  family?: string;
  familyId?: string;
  programFamilyCode?: string;
  note?: string;
  chip?: string;
  recommendations?: {
    defaultExamType?: string;
    timingExpectation?: string;
    securitySuggestion?: string;
    reviewPolicy?: string;
    resultVisibility?: string;
    questionMixGuidance?: string;
    authoringNote?: string;
    suggestedDurationMinutes?: string;
    suggestedSectionCount?: number;
    suggestedQuestionCountBand?: string;
    suggestedAccessPolicy?: string;
  };
  builderDefaults?: {
    exam?: {
      titleSuffix?: string;
      codeSuffix?: string;
      description?: string;
      examType?: string;
      deliveryMode?: string;
      status?: string;
      durationMinutes?: string;
      passingMarks?: string;
    };
    delivery?: {
      timerMode?: string;
      navigationMode?: string;
      attemptPolicy?: string;
      securityMode?: string;
      resultPublishMode?: string;
      reviewMode?: string;
    };
    experience?: {
      recommendedTimerMode?: string;
      recommendedNavigationMode?: string;
    };
    sections?: Array<{
      name?: string;
      questionCount?: number;
      negativeMarksPerQuestion?: string;
    }>;
  };
};

export async function fetchPresetPacks(page: Page) {
  const response = await page.request.get("/api/exams/preset-packs?is_active=true", {
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    count: number;
    results: ExamPresetPackPayload[];
  };
}

export function expectFamilyPresetPackContracts(packs: ExamPresetPackPayload[]) {
  const neet = packs.find((pack) => pack.id === "neet_mock");
  const jee = packs.find((pack) => pack.id === "jee_mains_math");
  const gre = packs.find((pack) => pack.id === "gre_quant");
  const aws = packs.find((pack) => pack.id === "aws_practitioner");
  const ielts = packs.find((pack) => pack.id === "ielts_academic");
  const pte = packs.find((pack) => pack.id === "pte_academic");

  expect(neet).toBeTruthy();
  expect(jee).toBeTruthy();
  expect(gre).toBeTruthy();
  expect(aws).toBeTruthy();
  expect(ielts).toBeTruthy();
  expect(pte).toBeTruthy();

  expect(neet?.familyId).toBe("neet");
  expect(neet?.programFamilyCode).toBe("competitive");
  expect(neet?.recommendations?.defaultExamType).toBe("mock_test");
  expect(neet?.builderDefaults?.exam?.durationMinutes).toBe("180");
  expect(neet?.builderDefaults?.delivery?.timerMode).toBe("section");
  expect(neet?.builderDefaults?.sections?.length).toBe(3);
  expect(neet?.builderDefaults?.sections?.[0]?.negativeMarksPerQuestion).toBe("1.00");

  expect(jee?.familyId).toBe("jee");
  expect(jee?.programFamilyCode).toBe("competitive");
  expect(jee?.recommendations?.defaultExamType).toBe("mock_test");
  expect(jee?.builderDefaults?.delivery?.timerMode).toBe("hybrid");
  expect(jee?.builderDefaults?.delivery?.navigationMode).toBe("hybrid");
  expect(jee?.builderDefaults?.sections?.[1]?.name).toMatch(/numeric/i);
  expect(jee?.builderDefaults?.sections?.[1]?.negativeMarksPerQuestion).toBe("0.00");

  expect(gre?.familyId).toBe("gre");
  expect(gre?.programFamilyCode).toBe("competitive");
  expect(gre?.recommendations?.defaultExamType).toBe("sectional_test");
  expect(gre?.builderDefaults?.delivery?.timerMode).toBe("section");
  expect(gre?.builderDefaults?.sections?.length).toBe(2);
  expect(gre?.builderDefaults?.sections?.[0]?.questionCount).toBe(20);

  expect(aws?.familyId).toBe("aws_certification");
  expect(aws?.programFamilyCode).toBe("certification");
  expect(aws?.recommendations?.defaultExamType).toBe("practice_test");
  expect(aws?.builderDefaults?.delivery?.attemptPolicy).toBe("unlimited_practice");
  expect(aws?.builderDefaults?.delivery?.resultPublishMode).toBe("immediate");
  expect(aws?.builderDefaults?.sections?.length).toBe(1);
  expect(aws?.builderDefaults?.sections?.[0]?.questionCount).toBe(25);

  expect(ielts?.familyId).toBe("language_proficiency");
  expect(ielts?.programFamilyCode).toBe("language_proficiency");
  expect(ielts?.recommendations?.defaultExamType).toBe("mock_exam");
  expect(ielts?.builderDefaults?.delivery?.timerMode).toBe("section");
  expect(ielts?.builderDefaults?.sections?.length).toBe(3);
  expect(ielts?.builderDefaults?.sections?.[2]?.name).toMatch(/writing/i);

  expect(pte?.familyId).toBe("language_proficiency");
  expect(pte?.programFamilyCode).toBe("language_proficiency");
  expect(pte?.recommendations?.defaultExamType).toBe("mock_exam");
  expect(pte?.builderDefaults?.delivery?.timerMode).toBe("section");
  expect(pte?.builderDefaults?.sections?.length).toBe(2);
  expect(pte?.builderDefaults?.sections?.[0]?.name).toMatch(/integrated/i);
}
