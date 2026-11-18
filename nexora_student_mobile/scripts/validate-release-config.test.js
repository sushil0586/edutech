const assert = require("node:assert/strict");
const test = require("node:test");

const { validateReleaseConfig } = require("./validate-release-config");
const {
  removeDebugReleaseSigning,
} = require("../plugins/with-android-release-safety");

test("accepts public HTTPS endpoints without secret-like variables", () => {
  const result = validateReleaseConfig({
    EXPO_PUBLIC_API_BASE_URL: "https://stage.example.test",
    EXPO_PUBLIC_ANDROID_API_BASE_URL: "https://stage.example.test",
    EXPO_PUBLIC_IOS_API_BASE_URL: "https://stage.example.test",
    EXPO_PUBLIC_WEB_PORTAL_URL: "https://learn.example.test",
    EXPO_PUBLIC_SHOW_MOBILE_DEBUG_PANEL: "false",
  });

  assert.equal(result.EXPO_PUBLIC_API_BASE_URL.protocol, "https:");
  assert.equal(result.EXPO_PUBLIC_WEB_PORTAL_URL.hostname, "learn.example.test");
});

test("rejects missing, cleartext, local, and credential-bearing endpoints", () => {
  assert.throws(() => validateReleaseConfig({}), /required/);
  assert.throws(
    () => validateReleaseConfig({ EXPO_PUBLIC_API_BASE_URL: "http://example.test" }),
    /HTTPS/,
  );
  assert.throws(
    () => validateReleaseConfig({ EXPO_PUBLIC_API_BASE_URL: "https://10.0.2.2:9001" }),
    /must not target/,
  );
  assert.throws(
    () => validateReleaseConfig({ EXPO_PUBLIC_API_BASE_URL: "https://user:pass@example.test" }),
    /embedded credentials/,
  );
  assert.throws(
    () =>
      validateReleaseConfig({
        EXPO_PUBLIC_API_BASE_URL: "https://example.test",
        EXPO_PUBLIC_WEB_PORTAL_URL: "http://example.test",
      }),
    /HTTPS/,
  );
});

test("rejects public secret-like variables and an enabled debug panel", () => {
  const endpoint = "https://stage.example.test";
  assert.throws(
    () =>
      validateReleaseConfig({
        EXPO_PUBLIC_API_BASE_URL: endpoint,
        EXPO_PUBLIC_ACCESS_TOKEN: "not-public",
      }),
    /secret-like/,
  );
  assert.throws(
    () =>
      validateReleaseConfig({
        EXPO_PUBLIC_API_BASE_URL: endpoint,
        EXPO_PUBLIC_SHOW_MOBILE_DEBUG_PANEL: "true",
      }),
    /debug panel/,
  );
});

test("rejects placeholder package identities for production only", () => {
  const environment = { EXPO_PUBLIC_API_BASE_URL: "https://stage.example.test" };
  const anonymousConfig = {
    expo: {
      android: { package: "com.anonymous.student" },
      ios: { bundleIdentifier: "com.anonymous.student" },
    },
  };

  assert.doesNotThrow(() =>
    validateReleaseConfig(environment, { profile: "preview", appConfig: anonymousConfig }),
  );
  assert.throws(
    () => validateReleaseConfig(environment, { profile: "production", appConfig: anonymousConfig }),
    /authorized product identities/,
  );
});

test("removes release debug signing idempotently even when the marker already exists", () => {
  const source = `buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }`;

  const firstPass = removeDebugReleaseSigning(source);
  const secondPass = removeDebugReleaseSigning(firstPass);
  const reintroducedSigning = firstPass.replace(
    "release {",
    "release {\n            signingConfig signingConfigs.debug",
  );
  const repairedPass = removeDebugReleaseSigning(reintroducedSigning);

  assert.equal(secondPass, firstPass);
  assert.match(firstPass, /debug \{\s+signingConfig signingConfigs\.debug/);
  assert.doesNotMatch(firstPass, /release \{\s+signingConfig signingConfigs\.debug/);
  assert.doesNotMatch(repairedPass, /release \{\s+signingConfig signingConfigs\.debug/);
  assert.equal(
    repairedPass.match(/EAS or Gradle-injected credentials must sign release artifacts\./g)?.length,
    1,
  );
});
