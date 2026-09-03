import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherComprehensionImportEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_IMPORT_ACTIONS",
);
const teacherApiBaseUrl = resolveBackendBaseUrl();

type SessionProfile = {
  institute?: string | null;
};

type SubjectRow = {
  id: string;
  code: string;
  name: string;
};

type TopicRow = {
  id: string;
  code: string;
  name: string;
};

type PassageRow = {
  id: string;
  title: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function finalizeImportButtonName(validRowCount: number) {
  return new RegExp(`(?:finalize import|import valid rows) \\(${validRowCount}\\)`, "i");
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function fetchTeacherProfile(page: Page, accessToken: string) {
  const response = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Teacher session profile fetch failed with status ${response.status()}`).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function fetchSubjectRows(page: Page, accessToken: string, instituteId: string) {
  const response = await page.request.get(
    `${teacherApiBaseUrl}/api/v1/academics/subjects/?institute=${encodeURIComponent(instituteId)}&is_active=true&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 15000,
    },
  );
  expect(response.ok(), `Subject lookup failed with status ${response.status()}`).toBe(true);
  const payload = (await response.json()) as { results?: SubjectRow[] };
  return payload.results ?? [];
}

async function fetchTopicRows(page: Page, accessToken: string, instituteId: string, subjectId: string) {
  const response = await page.request.get(
    `${teacherApiBaseUrl}/api/v1/academics/topics/?institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subjectId)}&is_active=true&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 15000,
    },
  );
  expect(response.ok(), `Topic lookup failed with status ${response.status()}`).toBe(true);
  const payload = (await response.json()) as { results?: TopicRow[] };
  return payload.results ?? [];
}

async function selectAcademicImportCodes(page: Page, accessToken: string, instituteId: string) {
  const subjects = await fetchSubjectRows(page, accessToken, instituteId);
  expect(subjects.length).toBeGreaterThan(0);

  for (const subject of subjects) {
    const topics = await fetchTopicRows(page, accessToken, instituteId, subject.id);
    if (topics.length > 0) {
      return {
        subject,
        topic: topics[0]!,
      };
    }
  }

  return null;
}

async function lookupImportedPassageId(
  page: Page,
  accessToken: string,
  title: string,
) {
  const response = await page.request.get(
    `${teacherApiBaseUrl}/api/v1/question-bank/passages/?is_active=true&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 15000,
    },
  );
  if (!response.ok()) {
    return null;
  }
  const payload = (await response.json()) as { results?: PassageRow[] };
  const passage =
    payload.results?.find((row) => row.title.trim() === title.trim()) ?? null;
  return passage?.id ?? null;
}

async function gotoTeacherComprehensionImport(page: Page) {
  await page.goto("/teacher/question-bank/comprehension/import");
  await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
}

async function isBlockedState(page: Page) {
  const pageText = await page.locator("body").innerText();
  return /question-bank bulk import is not enabled for your institute yet/i.test(pageText);
}

test.describe("Teacher mutable comprehension import finalize lane", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.skip(
    !mutableTeacherComprehensionImportEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_IMPORT_ACTIONS",
      "disposable teacher comprehension import finalize coverage",
    ),
  );

  test("@workflow @mutable teacher can preview, finalize, verify, and clean up a disposable comprehension import", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherComprehensionImport(page);

    if (await isBlockedState(page)) {
      await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
      await expect(
        page.getByText(/question-bank bulk import is not enabled for your institute yet/i).first(),
      ).toBeVisible();
      return;
    }

    const accessToken = await getAccessToken(page);
    expect(accessToken).not.toBe("");

    const profile = await fetchTeacherProfile(page, accessToken);
    expect(profile.institute).toBeTruthy();

    const academicCodes = await selectAcademicImportCodes(page, accessToken, profile.institute!);
    expect(academicCodes).not.toBeNull();
    const { subject, topic } = academicCodes!;

    const uniqueSeed = Date.now();
    const title = `PW Teacher Import Passage ${uniqueSeed}`;
    const description = `Playwright import description ${uniqueSeed}`;
    const passageText = `Imported shared passage ${uniqueSeed} about secure identity and cloud responsibility.`;
    let importedPassageId: string | null = null;

    try {
      const fileInput = page.getByTestId("question-passage-import-file-input");
      await fileInput.setInputFiles({
        name: `teacher-comprehension-import-${uniqueSeed}.csv`,
        mimeType: "text/csv",
        buffer: Buffer.from(
          [
            "subject,topic,title,content_format,passage_text,description",
            `${subject.code},${topic.code},${title},markdown_latex,${passageText},${description}`,
          ].join("\n"),
        ),
      });

      await page.getByRole("button", { name: /preview import/i }).click();

      await expect(page.getByText(/preview results/i).first()).toBeVisible();
      const finalizeImportButton = page.getByRole("button", {
        name: finalizeImportButtonName(1),
      });
      await expect(finalizeImportButton).toBeVisible();
      await expect(page.locator(".builderSummaryCard").filter({ has: page.getByText(/^preview valid rows$/i) }).locator("strong")).toHaveText("1");
      await expect(page.locator(".builderSummaryCard").filter({ has: page.getByText(/^preview invalid rows$/i) }).locator("strong")).toHaveText("0");
      await expect(page.getByText(new RegExp(escapeRegExp(title), "i")).first()).toBeVisible();

      await finalizeImportButton.click();

      await expect(
        page.getByText(/1 comprehension set\(s\) were imported into the question bank\./i).first(),
      ).toBeVisible();
      await expect(page.getByText(/preview results/i)).toHaveCount(0);
      await expect(fileInput).toHaveValue("");

      await expect
        .poll(
          () =>
            lookupImportedPassageId(page, accessToken, title),
          { timeout: 30000 },
        )
        .not.toBeNull();

      importedPassageId = await lookupImportedPassageId(page, accessToken, title);
      expect(importedPassageId).not.toBeNull();

      await page.goto(`/teacher/question-bank/comprehension/${importedPassageId}`);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue(title);
      await expect(page.locator('textarea[name="passage_text"]')).toHaveValue(
        new RegExp(escapeRegExp(passageText)),
      );
      await expect(page.locator('textarea[name="description"]')).toHaveValue(
        new RegExp(escapeRegExp(description)),
      );
    } finally {
      if (importedPassageId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deletePassageResponse = await page.request.delete(
          `/api/question-bank/passages/${importedPassageId}`,
        );
        expect(deletePassageResponse.ok()).toBe(true);
      }
    }
  });
});
