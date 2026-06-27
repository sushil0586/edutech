import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const mutableAdminExamCreationEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const scenarios = [
  {
    presetId: "jee_mains_math",
    familyButtonLabel: /jee/i,
    programLabel: "Demo NEET Track (DM-NEET)",
  },
  {
    presetId: "gre_quant",
    familyButtonLabel: /gre/i,
    programLabel: "Demo NEET Track (DM-NEET)",
  },
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function applyAdminInstituteScope(page: Page) {
  const instituteChip = page
    .locator(".academicInstituteChip")
    .filter({ has: page.getByText(/demo learning institute/i) })
    .first();
  await expect(instituteChip).toBeVisible();
  await instituteChip.click();
  await expect(page).toHaveURL(/\/admin\/exams\/new\?institute=/);
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
    description?: string;
  };
}

function findPresetPack(packs: ExamPresetPackPayload[], presetId: string) {
  const pack = packs.find((item) => item.id === presetId) ?? null;
  expect(pack).not.toBeNull();
  return pack!;
}

async function createAdminGuidedFamilyExam(
  page: Page,
  pack: ExamPresetPackPayload,
  options: {
    familyButtonLabel: RegExp;
    programLabel: string;
    uniqueSeed: number;
  },
) {
  const examTitle = `PW Admin Guided ${pack.id} ${options.uniqueSeed}`;
  const examCode = `PW-AG-${pack.id.slice(0, 6).toUpperCase()}-${options.uniqueSeed}`;

  await page.goto("/admin/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await applyAdminInstituteScope(page);

  await page.locator('input[name="title"]').first().fill(examTitle);
  await page.locator('input[name="code"]').first().fill(examCode);
  await page.locator('select[name="source_type"]').first().selectOption("institute");
  await page.locator('select[name="program"]').first().selectOption({ label: options.programLabel });
  await page.getByRole("button", { name: options.familyButtonLabel }).click();

  await expect(page.locator('input[name="duration_minutes"]').first()).toHaveValue(
    pack.builderDefaults?.exam?.durationMinutes ?? "",
  );

  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /create exam shell/i }).click();

  await expect(page).toHaveURL(/\/admin\/exams\?message=/);
  const createdExamCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first(),
  }).first();
  await expect(createdExamCard).toBeVisible();

  const openExamHref = await createdExamCard.getByRole("link", { name: /open exam/i }).getAttribute("href");
  const examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
  };
}

test.describe("Admin family guided persistence", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminExamCreationEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "platform-admin guided family persistence coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable admin guided create persists ${scenario.presetId} defaults into saved exam metadata`, async ({
      page,
    }) => {
      test.setTimeout(180000);

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const presetPayload = await fetchPresetPacks(page);
      const pack = findPresetPack(presetPayload.results, scenario.presetId);

      let examId: string | null = null;
      try {
        const created = await createAdminGuidedFamilyExam(page, pack, {
          familyButtonLabel: scenario.familyButtonLabel,
          programLabel: scenario.programLabel,
          uniqueSeed: Date.now(),
        });
        examId = created.examId;

        const detail = await fetchAdminExamDetail(page, examId);
        expect(detail.title).toBe(created.examTitle);
        expect(detail.code).toBe(created.examCode);
        expect(detail.exam_type).toBe(pack.builderDefaults?.exam?.examType);
        expect(String(detail.duration_minutes)).toBe(pack.builderDefaults?.exam?.durationMinutes);
        expect(detail.timer_mode).toBe(pack.builderDefaults?.delivery?.timerMode);
        expect(detail.navigation_mode).toBe(pack.builderDefaults?.delivery?.navigationMode);
        expect(detail.attempt_policy).toBe(pack.builderDefaults?.delivery?.attemptPolicy);
        expect(detail.security_mode).toBe(pack.builderDefaults?.delivery?.securityMode);
        expect(detail.result_publish_mode).toBe(pack.builderDefaults?.delivery?.resultPublishMode);
        expect(detail.review_mode).toBe(pack.builderDefaults?.delivery?.reviewMode);
        expect(detail.description ?? "").toContain(pack.builderDefaults?.exam?.description ?? "");
      } finally {
        if (examId) {
          await loginAsRole(page, "admin");
          await expectAdminWorkspace(page);
          await deleteAdminExamDirectly(page, examId);
        }
      }
    });
  }
});
