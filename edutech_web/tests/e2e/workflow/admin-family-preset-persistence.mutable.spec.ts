import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const mutableAdminExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const familyPresetIds = [
  "neet_mock",
  "jee_mains_math",
  "gre_quant",
  "aws_practitioner",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function alignAdminScopeWithPresetFamily(page: Page, pack: ExamPresetPackPayload) {
  await page.getByLabel(/select template institute/i).selectOption("Demo Learning Institute (DLI001)");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();

  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  const programLabel = pack.programFamilyCode === "certification" ? "Demo AWS Track" : "Demo NEET Track";
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select")
    .selectOption({ label: programLabel });
  const subjectLabel = pack.programFamilyCode === "certification" ? "AWS Cloud Practitioner" : "NEET Biology";
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Subject$/i) })
    .locator("select")
    .selectOption({ label: subjectLabel });
  await expect(page.getByText(new RegExp(`Assessment family:\\s*${pack.programFamilyCode}`, "i"))).toBeVisible();
  await page.getByRole("button", { name: new RegExp(pack.label, "i") }).click();
  await expect(page.getByText(new RegExp(`active pack:\\s*${escapeRegExp(pack.label)}`, "i"))).toBeVisible();
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function fetchAdminExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    id: string;
    title: string;
    code: string;
    exam_type: string;
    duration_minutes: number;
    timer_mode: string;
    navigation_mode: string;
    attempt_policy: string;
    security_mode: string;
    result_publish_mode: string;
    review_mode: string;
    experience_profile?: {
      recommended_timer_mode?: string;
      recommended_navigation_mode?: string;
      assessment_family?: string;
      assessment_family_label?: string;
    };
    metadata: {
      advanced_builder?: {
        preset_pack_code?: string;
      };
    };
    sections: Array<{
      title?: string;
      name?: string;
      question_count?: number;
      marks_per_question?: string;
      negative_marks?: string;
      negative_marks_per_question?: string;
    }>;
  };
}

async function normalizeBuilderCompositionForCreate(page: Page) {
  await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();

  const sectionCards = page.locator(".advancedBuilderSectionCard");
  for (let index = await sectionCards.count() - 1; index >= 1; index -= 1) {
    await sectionCards
      .nth(index)
      .locator(".advancedBuilderSectionCardTop")
      .getByRole("button", { name: /^remove$/i })
      .click();
  }

  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/question count/i).fill("1");

  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }

  await firstSectionCard.locator(".advancedBuilderTopicRow").first().locator('input[type="number"]').fill("1");
}

test.describe("Admin family preset persistence", () => {
  test.skip(
    testRequiresRole("admin"),
    "Admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
      "admin family preset persistence coverage",
    ),
  );

  test("@workflow @mutable admin can persist family preset defaults into saved exam metadata", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const presetPayload = await fetchPresetPacks(page);

    for (const presetId of familyPresetIds) {
      const pack = presetPayload.results.find((item) => item.id === presetId);
      expect(pack).toBeTruthy();
      expect(pack?.builderDefaults?.exam).toBeTruthy();
      expect(pack?.builderDefaults?.delivery).toBeTruthy();

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const examTitle = `PW Admin ${presetId} ${uniqueSeed}`;
      const examCode = `PW-${presetId.slice(0, 8).toUpperCase()}-${uniqueSeed}`;

      try {
        await page.goto(`/admin/exams/advanced?preset_pack=${encodeURIComponent(presetId)}`);
        await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
        await expect(page.getByText(new RegExp(`active pack:\\s*${escapeRegExp(pack!.label)}`, "i"))).toBeVisible();
        await alignAdminScopeWithPresetFamily(page, pack!);

        await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
        await page.getByLabel(/exam title/i).fill(examTitle);
        await page.getByLabel(/exam code/i).fill(examCode);

        await normalizeBuilderCompositionForCreate(page);

        const previewResponsePromise = page.waitForResponse((response) =>
          response.url().includes("/api/exams/advanced-builder/preview") &&
          response.request().method() === "POST",
        );
        await page.getByRole("button", { name: /preview exam/i }).click();
        const previewResponse = await previewResponsePromise;
        expect(previewResponse.ok()).toBe(true);

        await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });

        await page.getByRole("button", { name: /create advanced exam/i }).click();
        await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/, { timeout: 60000 });

        const builderUrl = page.url();
        examId = builderUrl.match(/\/admin\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
        expect(examId).not.toBeNull();

        const detail = await fetchAdminExamDetail(page, examId!);
        expect(detail.title).toBe(examTitle);
        expect(detail.code).toBe(examCode);
        expect(detail.exam_type).toBe(pack!.builderDefaults!.exam!.examType);
        expect(String(detail.duration_minutes)).toBe(pack!.builderDefaults!.exam!.durationMinutes);
        expect(detail.timer_mode).toBe(pack!.builderDefaults!.delivery!.timerMode);
        expect(detail.navigation_mode).toBe(pack!.builderDefaults!.delivery!.navigationMode);
        expect(detail.attempt_policy).toBe(pack!.builderDefaults!.delivery!.attemptPolicy);
        expect(detail.security_mode).toBe(pack!.builderDefaults!.delivery!.securityMode);
        expect(detail.result_publish_mode).toBe(pack!.builderDefaults!.delivery!.resultPublishMode);
        expect(detail.review_mode).toBe(pack!.builderDefaults!.delivery!.reviewMode);
        expect(detail.metadata.advanced_builder?.preset_pack_code).toBe(presetId);
        expect(detail.experience_profile?.recommended_timer_mode).toBe(
          pack!.builderDefaults!.experience?.recommendedTimerMode,
        );
        expect(detail.experience_profile?.recommended_navigation_mode).toBe(
          pack!.builderDefaults!.experience?.recommendedNavigationMode,
        );
      } finally {
        if (examId) {
          await loginAsRole(page, "admin");
          await expectAdminWorkspace(page);
          await deleteAdminExamDirectly(page, examId);
        }
      }
    }
  });
});
