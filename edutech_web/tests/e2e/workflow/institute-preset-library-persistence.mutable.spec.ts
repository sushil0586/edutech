import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type PresetPackListResponse = {
  results?: Array<{
    id: string;
    resourceId?: string;
    label: string;
  }>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    metadata: {
      advanced_builder?: {
        preset_pack_code?: string;
      };
    };
  };
}

async function cleanupPresetPacks(page: Page, packCode: string, packLabel: string) {
  const response = await page.request.get("/api/exams/preset-packs");
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as PresetPackListResponse;
  const matchingPacks =
    payload.results?.filter(
      (pack) =>
        pack.resourceId &&
        (pack.id === packCode ||
          pack.label === packLabel ||
          pack.label.startsWith(`${packLabel} (`)),
    ) ?? [];

  for (const pack of matchingPacks) {
    const deleteResponse = await page.request.delete(`/api/exams/preset-packs/${pack.resourceId}`);
    expect(deleteResponse.ok()).toBe(true);
  }
}

async function alignInstituteScope(page: Page) {
  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Program$/i) })
    .locator("select")
    .selectOption({ label: "Demo AWS Track" });
  await page
    .locator(".advancedBuilderField", { has: page.getByText(/^Subject$/i) })
    .locator("select")
    .selectOption({ label: "AWS Cloud Practitioner" });
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

test.describe("Institute managed preset pack persistence", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
      "institute managed preset pack exam-creation persistence coverage",
    ),
  );

  test("@workflow @mutable institute can create an exam from a managed preset library pack and persist its defaults", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const packLabel = `PW Institute Builder Pack ${uniqueSeed}`;
    const packCode = `pw_institute_builder_pack_${uniqueSeed}`;
    const examTitle = `PW Institute Library Persist ${uniqueSeed}`;
    const examCode = `PW-ILP-${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await page.goto("/institute/exams/advanced?preset_pack=aws_practitioner");
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
      await alignInstituteScope(page);
      await expect(page.getByText(/active pack:\s*aws cloud practitioner/i)).toBeVisible();

      await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
      await page.getByLabel(/exam type/i).selectOption("quiz");
      await page.getByRole("spinbutton", { name: "Duration in minutes", exact: true }).fill("47");

      await page.getByRole("tab", { name: /\bdelivery\b/i }).first().click();
      await page.getByLabel(/timer mode/i).selectOption("global");
      await page.getByLabel(/navigation mode/i).selectOption("free");
      await page.getByLabel(/attempt policy/i).selectOption("single_attempt");
      await page.getByLabel(/security mode/i).selectOption("basic_proctoring");
      await page.getByLabel(/result publish mode/i).selectOption("scheduled");
      await page.getByLabel(/review mode/i).selectOption("after_publish");

      await normalizeBuilderCompositionForCreate(page);

      await page.getByRole("textbox", { name: /preset label/i }).fill(packLabel);
      await page.getByRole("textbox", { name: /preset code/i }).fill(packCode);
      await page.getByRole("textbox", { name: /^family$/i }).fill("Institute Managed");
      await page.getByRole("textbox", { name: /^chip$/i }).fill("Library Persist");
      await page.getByRole("textbox", { name: /pack note/i }).fill(
        "Disposable institute-managed pack used to verify preset-library exam creation persistence.",
      );
      await page.getByRole("button", { name: /save as managed pack/i }).click();
      await expect(
        page.getByText(new RegExp(`saved "${escapeRegExp(packLabel)}" as a managed preset pack for institute scope`, "i")),
      ).toBeVisible();

      await page.goto("/institute/exams/preset-packs");
      await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
      await page.getByLabel(/search preset packs/i).fill(packCode);
      await page.locator(".advancedBuilderSavedTemplateFilter").getByRole("button", { name: /institute/i }).click();

      const packCard = page.locator(".presetLibraryCard").filter({
        has: page.getByText(new RegExp(escapeRegExp(packLabel), "i")).first(),
      }).first();
      await expect(packCard).toBeVisible();
      await packCard.getByRole("link", { name: /open in builder/i }).click();

      await expect(page).toHaveURL(new RegExp(`/institute/exams/advanced\\?preset_pack=${escapeRegExp(packCode)}`));
      await expect(page.getByText(new RegExp(`active pack:\\s*${escapeRegExp(packLabel)}`, "i"))).toBeVisible();

      await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
      await expect(page.getByLabel(/exam type/i)).toHaveValue("quiz");
      await expect(page.getByRole("spinbutton", { name: "Duration in minutes", exact: true })).toHaveValue("47");

      await page.getByRole("tab", { name: /\bdelivery\b/i }).first().click();
      await expect(page.getByLabel(/timer mode/i)).toHaveValue("global");
      await expect(page.getByLabel(/navigation mode/i)).toHaveValue("free");
      await expect(page.getByLabel(/attempt policy/i)).toHaveValue("single_attempt");
      await expect(page.getByLabel(/security mode/i)).toHaveValue("basic_proctoring");
      await expect(page.getByLabel(/result publish mode/i)).toHaveValue("scheduled");
      await expect(page.getByLabel(/review mode/i)).toHaveValue("after_publish");

      await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
      await page.getByLabel(/exam title/i).fill(examTitle);
      await page.getByLabel(/exam code/i).fill(examCode);

      const previewResponsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/exams/advanced-builder/preview") &&
        response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /preview exam/i }).click();
      const previewResponse = await previewResponsePromise;
      expect(previewResponse.ok()).toBe(true);
      await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });

      await page.getByRole("button", { name: /create advanced exam/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder\?message=/, { timeout: 60000 });

      examId = page.url().match(/\/institute\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      const detail = await fetchInstituteExamDetail(page, examId!);
      expect(detail.title).toBe(examTitle);
      expect(detail.code).toBe(examCode);
      expect(detail.exam_type).toBe("quiz");
      expect(String(detail.duration_minutes)).toBe("47");
      expect(detail.timer_mode).toBe("global");
      expect(detail.navigation_mode).toBe("free");
      expect(detail.attempt_policy).toBe("single_attempt");
      expect(detail.security_mode).toBe("basic_proctoring");
      expect(detail.result_publish_mode).toBe("scheduled");
      expect(detail.review_mode).toBe("after_publish");
      expect(detail.metadata.advanced_builder?.preset_pack_code).toBe(packCode);
    } finally {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      if (examId) {
        await deleteInstituteExam(page, examId);
      }
      await cleanupPresetPacks(page, packCode, packLabel);
    }
  });
});
