function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function resolveBackendBaseUrl() {
  const explicitPlaywrightApiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL?.trim();
  if (explicitPlaywrightApiBaseUrl) {
    return normalizeUrl(explicitPlaywrightApiBaseUrl);
  }

  const configuredApiBaseUrl =
    process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredApiBaseUrl) {
    return normalizeUrl(configuredApiBaseUrl);
  }

  const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (playwrightBaseUrl) {
    try {
      const url = new URL(playwrightBaseUrl);
      const isLocalFrontendHost =
        (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
        /^30\d\d?$/.test(url.port || "");
      if (isLocalFrontendHost) {
        return "http://127.0.0.1:9001";
      }
      return normalizeUrl(url.origin);
    } catch {
      // Fall through to explicit API env vars when the base URL is not absolute.
    }
  }

  return "http://127.0.0.1:9001";
}
