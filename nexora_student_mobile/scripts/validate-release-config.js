const net = require("node:net");

const RELEASE_PROFILES = new Set(["preview", "production"]);
const PUBLIC_ENDPOINT_ENV_KEYS = [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_ANDROID_API_BASE_URL",
  "EXPO_PUBLIC_IOS_API_BASE_URL",
  "EXPO_PUBLIC_WEB_PORTAL_URL",
];

function isPrivateIpv4(hostname) {
  if (net.isIP(hostname) !== 4) return false;
  const [a, b] = hostname.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function validateHttpsUrl(key, value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid absolute URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${key} must use HTTPS for preview and production builds.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${key} must not contain embedded credentials.`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "10.0.2.2" ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error(`${key} must not target a loopback, emulator, or private-network host.`);
  }
  return parsed;
}

function validateReleaseConfig(
  environment = process.env,
  { profile = environment.EAS_BUILD_PROFILE?.trim() || "manual", appConfig } = {},
) {
  const baseUrl = environment.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for preview and production builds.");
  }

  const validated = {};
  for (const key of PUBLIC_ENDPOINT_ENV_KEYS) {
    const value = environment[key]?.trim();
    if (value) validated[key] = validateHttpsUrl(key, value);
  }
  if (environment.EXPO_PUBLIC_SHOW_MOBILE_DEBUG_PANEL === "true") {
    throw new Error("The mobile debug panel must be disabled in preview and production builds.");
  }

  const exposedSecretKeys = Object.keys(environment).filter(
    (key) =>
      key.startsWith("EXPO_PUBLIC_") &&
      /(PASSWORD|SECRET|TOKEN|CREDENTIAL)/i.test(key) &&
      Boolean(environment[key]),
  );
  if (exposedSecretKeys.length) {
    throw new Error(`Public Expo variables contain secret-like keys: ${exposedSecretKeys.join(", ")}`);
  }
  if (profile === "production") {
    const config = appConfig ?? require("../app.json");
    const androidPackage = config.expo?.android?.package ?? "";
    const iosBundleIdentifier = config.expo?.ios?.bundleIdentifier ?? "";
    if (androidPackage.startsWith("com.anonymous.") || iosBundleIdentifier.startsWith("com.anonymous.")) {
      throw new Error("Production package identifiers must be replaced with authorized product identities.");
    }
  }
  return validated;
}

function main() {
  const profile = process.env.EAS_BUILD_PROFILE?.trim() || "manual";
  const easHook = process.argv.includes("--eas-hook");
  if (easHook && !RELEASE_PROFILES.has(profile)) {
    console.log(`Release configuration validation skipped for EAS profile: ${profile}`);
    return;
  }
  const validated = validateReleaseConfig(process.env, { profile });
  const hosts = [...new Set(Object.values(validated).map((url) => url.hostname))];
  console.log(`Release configuration valid for ${profile}; HTTPS hosts: ${hosts.join(", ")}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { validateReleaseConfig };
