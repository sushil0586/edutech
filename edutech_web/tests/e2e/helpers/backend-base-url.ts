function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function resolveBackendBaseUrl() {
  const explicitPlaywrightApiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL?.trim();
  if (explicitPlaywrightApiBaseUrl) {
    return normalizeUrl(explicitPlaywrightApiBaseUrl);
  }

  const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (playwrightBaseUrl) {
    try {
      return normalizeUrl(new URL(playwrightBaseUrl).origin);
    } catch {
      // Fall through to explicit API env vars when the base URL is not absolute.
    }
  }

  const configuredApiBaseUrl =
    process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredApiBaseUrl) {
    return normalizeUrl(configuredApiBaseUrl);
  }

  return "http://127.0.0.1:9001";
}
