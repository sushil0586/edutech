import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { fetchPresetPacks, type ExamPresetPackPayload } from "../helpers/preset-packs";

const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
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

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function fetchInstituteExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  let response = await page.request.get(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  if (!response.ok()) {
    response = await page.request.get(`/api/institute/exams/${examId}`, {
      timeout: 15000,
    });
  }
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

async function createInstituteGuidedFamilyExam(
  page: Page,
  pack: ExamPresetPackPayload,
  options: {
    familyButtonLabel: RegExp;
    programLabel: string;
    uniqueSeed: number;
  },
) {
  const examTitle = `PW Institute Guided ${pack.id} ${options.uniqueSeed}`;
  const examCode = `PW-IG-${pack.id.slice(0, 6).toUpperCase()}-${options.uniqueSeed}`;

  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

  await page.locator('input[name="title"]').first().fill(examTitle);
  await page.locator('input[name="code"]').first().fill(examCode);
  await page.locator('select[name="program"]').first().selectOption({ label: options.programLabel });
  await page.getByRole("button", { name: options.familyButtonLabel }).click();

  await expect(page.locator('input[name="duration_minutes"]').first()).toHaveValue(
    pack.builderDefaults?.exam?.durationMinutes ?? "",
  );

  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /create exam shell/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  const detailUrl = page.url().split("?")[0] ?? page.url();
  const examId = detailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
  };
}

test.describe("Institute family guided persistence", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute guided family persistence coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable institute guided create persists ${scenario.presetId} defaults into saved exam metadata`, async ({
      page,
    }) => {
      test.setTimeout(180000);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const presetPayload = await fetchPresetPacks(page);
      const pack = findPresetPack(presetPayload.results, scenario.presetId);

      let examId: string | null = null;
      try {
        const created = await createInstituteGuidedFamilyExam(page, pack, {
          familyButtonLabel: scenario.familyButtonLabel,
          programLabel: scenario.programLabel,
          uniqueSeed: Date.now(),
        });
        examId = created.examId;

        const detail = await fetchInstituteExamDetail(page, examId);
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
          await loginAsRole(page, "institute");
          await expectInstituteWorkspace(page);
          await deleteInstituteExam(page, examId);
        }
      }
    });
  }
});
