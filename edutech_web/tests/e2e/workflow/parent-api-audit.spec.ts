import { expect, test, type APIResponse, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectParentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type ParentChildRecord = {
  relationship_id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  permissions: {
    can_view_progress: boolean;
    can_view_results: boolean;
    can_receive_alerts: boolean;
  };
  status: string;
  is_active: boolean;
};

type ParentPreferences = {
  score_drops: boolean;
  inactivity: boolean;
  milestones: boolean;
  weekly_summary: boolean;
  result_published: boolean;
  high_risk_exam_integrity: boolean;
};

type ParentAlert = {
  id: string;
  student: string | null;
  student_name: string;
  status: string;
  severity: string;
  alert_type: string;
  title: string;
};

type ParentAlertsResponse = {
  count: number;
  results: ParentAlert[];
  summary: {
    total: number;
    unread: number;
    read: number;
    resolved: number;
    dismissed: number;
    high: number;
    warning: number;
    info: number;
  };
  applied_filters: {
    child_id: string | null;
    status: string;
    severity: string;
    alert_type: string;
    ordering: string;
    search: string;
  };
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function parentApi(page: Page, path: string, options?: {
  data?: Record<string, unknown>;
  method?: "GET" | "PATCH" | "POST";
}) {
  const accessToken = await getAccessToken(page);
  const method = options?.method ?? "GET";
  return page.request.fetch(`${backendBaseUrl}${path}`, {
    method,
    data: options?.data,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

async function expectOkJson<T>(response: APIResponse) {
  expect(response.ok(), await response.text().catch(() => "")).toBe(true);
  return (await response.json()) as T;
}

test.describe("Parent API and boundary audit", () => {
  test.skip(testRequiresRole("parent"), "Parent Playwright credentials are not configured.");

  test("@workflow parent APIs expose linked-child data, persist preferences, and enforce child scope", async ({
    page,
  }, testInfo: TestInfo) => {
    await loginAsRole(page, "parent");
    await expectParentWorkspace(page);

    const children = await expectOkJson<ParentChildRecord[]>(
      await parentApi(page, "/api/v1/parent/children/"),
    );
    expect(children.length).toBeGreaterThan(0);

    const child = children.find((record) => record.permissions.can_view_progress) ?? children[0]!;
    expect(child.status).toBe("active");
    expect(child.is_active).toBe(true);
    expect(child.student_name.trim()).not.toBe("");
    expect(child.admission_no.trim()).not.toBe("");

    const childDetail = await expectOkJson<ParentChildRecord>(
      await parentApi(page, `/api/v1/parent/children/${child.student_id}/`),
    );
    expect(childDetail.student_id).toBe(child.student_id);
    expect(childDetail.relationship_id).toBe(child.relationship_id);

    const dashboard = await expectOkJson<{
      child: { student_id: string; student_name: string } | null;
      progress_summary: Record<string, unknown> | null;
      alert_summary: { total: number; unread: number };
    }>(await parentApi(page, `/api/v1/parent/dashboard/summary/?child_id=${child.student_id}`));
    expect(dashboard.child?.student_id).toBe(child.student_id);
    expect(dashboard.progress_summary).not.toBeNull();
    expect(dashboard.alert_summary.total).toBeGreaterThanOrEqual(0);

    const progress = await expectOkJson<{
      child: { student_id: string; student_name: string } | null;
      attempt_behavior: { attempt_count: number; attempted_questions: number; skipped_questions: number };
      recent_results: unknown[];
    }>(await parentApi(page, `/api/v1/parent/progress/?child_id=${child.student_id}`));
    expect(progress.child?.student_id).toBe(child.student_id);
    expect(progress.attempt_behavior.attempt_count).toBeGreaterThanOrEqual(0);

    const alerts = await expectOkJson<ParentAlertsResponse>(
      await parentApi(page, `/api/v1/parent/alerts/?child_id=${child.student_id}&page_size=10`),
    );
    expect(alerts.applied_filters.child_id).toBe(child.student_id);
    expect(alerts.summary.total).toBeGreaterThan(0);
    expect(alerts.results.length).toBeGreaterThan(0);
    expect(alerts.results.every((alert) => alert.student === child.student_id)).toBe(true);

    const filteredAlerts = await expectOkJson<ParentAlertsResponse>(
      await parentApi(page, `/api/v1/parent/alerts/?child_id=${child.student_id}&severity=warning&ordering=severity&page_size=10`),
    );
    expect(filteredAlerts.applied_filters.severity).toBe("warning");
    expect(filteredAlerts.results.every((alert) => alert.severity === "warning")).toBe(true);

    const invalidFilterResponse = await parentApi(page, "/api/v1/parent/alerts/?status=unsupported");
    expect(invalidFilterResponse.status()).toBe(400);

    const preferences = await expectOkJson<ParentPreferences>(
      await parentApi(page, "/api/v1/parent/preferences/"),
    );
    const toggledWeeklySummary = !preferences.weekly_summary;
    const patchedPreferences = await expectOkJson<ParentPreferences>(
      await parentApi(page, "/api/v1/parent/preferences/", {
        method: "PATCH",
        data: { weekly_summary: toggledWeeklySummary },
      }),
    );
    expect(patchedPreferences.weekly_summary).toBe(toggledWeeklySummary);
    const restoredPreferences = await expectOkJson<ParentPreferences>(
      await parentApi(page, "/api/v1/parent/preferences/", {
        method: "PATCH",
        data: { weekly_summary: preferences.weekly_summary },
      }),
    );
    expect(restoredPreferences.weekly_summary).toBe(preferences.weekly_summary);

    const unreadAlert = alerts.results.find((alert) => alert.status === "new") ?? alerts.results[0]!;
    const updatedAlert = await expectOkJson<ParentAlert>(
      await parentApi(page, `/api/v1/parent/alerts/${unreadAlert.id}/status/`, {
        method: "PATCH",
        data: { status: "read" },
      }),
    );
    expect(updatedAlert.id).toBe(unreadAlert.id);
    expect(updatedAlert.status).toBe("read");

    const markAllRead = await expectOkJson<{ updated_count: number }>(
      await parentApi(page, "/api/v1/parent/alerts/mark-all-read/", {
        method: "POST",
        data: {
          child_id: child.student_id,
          scope: "matching",
        },
      }),
    );
    expect(markAllRead.updated_count).toBeGreaterThanOrEqual(0);

    const invalidChildId = "00000000-0000-4000-8000-000000000000";
    const forbiddenChild = await parentApi(page, `/api/v1/parent/children/${invalidChildId}/`);
    expect([403, 404]).toContain(forbiddenChild.status());

    const forbiddenProgress = await parentApi(page, `/api/v1/parent/progress/?child_id=${invalidChildId}`);
    expect([403, 404]).toContain(forbiddenProgress.status());

    const evidence = {
      child: {
        studentId: child.student_id,
        studentName: child.student_name,
        admissionNo: child.admission_no,
        permissions: child.permissions,
      },
      dashboard: {
        childMatched: dashboard.child?.student_id === child.student_id,
        alertTotal: dashboard.alert_summary.total,
      },
      progress: {
        attemptCount: progress.attempt_behavior.attempt_count,
        recentResultCount: progress.recent_results.length,
      },
      alerts: {
        total: alerts.summary.total,
        firstStatusAfterPatch: updatedAlert.status,
        markAllReadUpdated: markAllRead.updated_count,
      },
      boundaries: {
        invalidAlertFilterStatus: invalidFilterResponse.status(),
        invalidChildStatus: forbiddenChild.status(),
        invalidProgressStatus: forbiddenProgress.status(),
      },
    };

    await testInfo.attach("parent-api-audit", {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: "application/json",
    });
    console.log("parent-api-audit", JSON.stringify(evidence));
  });
});
