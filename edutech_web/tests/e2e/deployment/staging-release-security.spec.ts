import { expect, test } from "@playwright/test";

const apiBaseUrl = (
  process.env.PLAYWRIGHT_API_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? ""
).replace(/\/$/, "");

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(`Missing mandatory staging gate variable: ${name}`);
  }
  return value;
}

function assertAuthorizedHttpsTarget(rawUrl: string) {
  const target = new URL(rawUrl);
  expect(target.protocol, "Staging release gates require HTTPS").toBe("https:");
  expect(target.hostname).not.toMatch(/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/);
}

test.describe("authorized staging release security", () => {
  test("running services attest the promoted release identity", async ({ request }) => {
    assertAuthorizedHttpsTarget(apiBaseUrl);
    const expectedGitSha = requiredEnvironment("EXPECTED_RELEASE_GIT_SHA");
    const expectedArtifactSha = requiredEnvironment("EXPECTED_RELEASE_ARCHIVE_SHA256");

    const healthResponse = await request.get(`${apiBaseUrl}/api/v1/health/`);
    expect(healthResponse.status()).toBe(200);
    const health = (await healthResponse.json()) as {
      build?: string;
      artifact_sha256?: string;
      environment?: string;
    };
    expect(health.build).toBe(expectedGitSha);
    expect(health.artifact_sha256).toBe(expectedArtifactSha);
    expect(health.environment).toBe("staging");

    const webResponse = await request.get(apiBaseUrl);
    expect(webResponse.status()).toBeLessThan(400);
    expect(webResponse.headers()["x-nexora-build"]).toBe(expectedGitSha);
    expect(webResponse.headers()["x-nexora-artifact"]).toBe(expectedArtifactSha);
    expect(webResponse.headers()["x-nexora-environment"]).toBe("staging");
  });

  test("assigned draft exam is concealed through the HTTPS entry point", async ({ request }) => {
    assertAuthorizedHttpsTarget(apiBaseUrl);
    const examId = requiredEnvironment("PLAYWRIGHT_STAGING_DRAFT_EXAM_ID");
    const username = requiredEnvironment("PLAYWRIGHT_STAGING_DRAFT_STUDENT_USERNAME");
    const password = requiredEnvironment("PLAYWRIGHT_STAGING_DRAFT_STUDENT_PASSWORD");

    const loginResponse = await request.post(`${apiBaseUrl}/api/v1/auth/login/`, {
      data: { username, password },
    });
    expect(loginResponse.status()).toBe(200);
    const login = (await loginResponse.json()) as {
      access?: string;
      user?: { student_profile?: string | null };
    };
    const access = login.access?.trim() ?? "";
    const studentId = login.user?.student_profile?.trim() ?? "";
    expect(access).not.toBe("");
    expect(studentId).not.toBe("");
    const headers = { Authorization: `Bearer ${access}` };

    const detailResponse = await request.get(
      `${apiBaseUrl}/api/v1/student/exams/${examId}/detail/`,
      { headers },
    );
    expect(detailResponse.status()).toBe(404);

    const availableResponse = await request.get(
      `${apiBaseUrl}/api/v1/student/exams/available/`,
      { headers },
    );
    expect(availableResponse.status()).toBe(200);
    const available = (await availableResponse.json()) as Array<{ id?: string }>;
    expect(available.map((exam) => exam.id)).not.toContain(examId);

    const startResponse = await request.post(`${apiBaseUrl}/api/v1/attempts/start/`, {
      headers,
      data: { exam: examId, student: studentId },
    });
    expect(startResponse.status()).toBe(400);
  });
});
