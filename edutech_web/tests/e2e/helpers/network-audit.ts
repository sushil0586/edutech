import { expect, type Page, type Request, type Response } from "@playwright/test";

type NetworkAuditFilter = {
  pathPrefixes?: string[];
};

export type ApiQueryParamMap = Record<string, string[]>;

export type NetworkAuditEntry = {
  id: string;
  url: string;
  pathname: string;
  search: string;
  method: string;
  status: number | null;
  startedAt: number;
  finishedAt: number | null;
  elapsedMs: number | null;
  query: ApiQueryParamMap;
  failureText: string | null;
};

type MutableNetworkAuditEntry = NetworkAuditEntry;

function buildQueryMap(url: URL): ApiQueryParamMap {
  const query: ApiQueryParamMap = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (!query[key]) {
      query[key] = [];
    }
    query[key].push(value);
  }
  return query;
}

function matchesPathPrefix(pathname: string, pathPrefixes: string[]) {
  return pathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function summarizeDuplicateRequests(entries: NetworkAuditEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const signature = `${entry.method} ${entry.pathname}${entry.search}`;
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([signature, count]) => ({ count, signature }))
    .sort((left, right) => right.count - left.count || left.signature.localeCompare(right.signature));
}

export function createNetworkAudit(page: Page, filter: NetworkAuditFilter = {}) {
  const pathPrefixes = filter.pathPrefixes ?? ["/api/admin/", "/api/v1/"];
  const trackedEntries = new Map<Request, MutableNetworkAuditEntry>();
  const orderedRequests: Request[] = [];
  const pendingRequests = new Set<Request>();
  let lastActivityAt = Date.now();

  function markActivity() {
    lastActivityAt = Date.now();
  }

  function shouldTrackUrl(rawUrl: string) {
    try {
      const url = new URL(rawUrl);
      return matchesPathPrefix(url.pathname, pathPrefixes);
    } catch {
      return false;
    }
  }

  function handleRequest(request: Request) {
    if (!shouldTrackUrl(request.url())) {
      return;
    }

    const url = new URL(request.url());
    if (trackedEntries.has(request)) {
      return;
    }

    trackedEntries.set(request, {
      elapsedMs: null,
      failureText: null,
      finishedAt: null,
      id: `${request.method()} ${request.url()} ${Date.now()}`,
      method: request.method(),
      pathname: url.pathname,
      query: buildQueryMap(url),
      search: url.search,
      startedAt: Date.now(),
      status: null,
      url: request.url(),
    });
    orderedRequests.push(request);
    pendingRequests.add(request);
    markActivity();
  }

  function finalizeEntry(request: Request, updater: (entry: MutableNetworkAuditEntry) => void) {
    const entry = trackedEntries.get(request);
    if (!entry) {
      return;
    }

    updater(entry);
    pendingRequests.delete(request);
    markActivity();
  }

  function handleResponse(response: Response) {
    finalizeEntry(response.request(), (entry) => {
      entry.status = response.status();
    });
  }

  function handleRequestFinished(request: Request) {
    finalizeEntry(request, (entry) => {
      entry.finishedAt = Date.now();
      entry.elapsedMs = entry.finishedAt - entry.startedAt;
    });
  }

  function handleRequestFailed(request: Request) {
    finalizeEntry(request, (entry) => {
      entry.finishedAt = Date.now();
      entry.elapsedMs = entry.finishedAt - entry.startedAt;
      entry.failureText = request.failure()?.errorText ?? "Request failed";
    });
  }

  function entries() {
    return orderedRequests
      .map((request) => trackedEntries.get(request))
      .filter((entry): entry is NetworkAuditEntry => Boolean(entry))
      .map((entry) => ({
        ...entry,
        query: Object.fromEntries(
          Object.entries(entry.query).map(([key, values]) => [key, [...values]]),
        ),
      }));
  }

  async function waitForSettled(args?: { quietWindowMs?: number; timeoutMs?: number }) {
    const quietWindowMs = args?.quietWindowMs ?? 500;
    const timeoutMs = args?.timeoutMs ?? 10_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const now = Date.now();
      if (pendingRequests.size === 0 && now - lastActivityAt >= quietWindowMs) {
        return;
      }
      await page.waitForTimeout(100);
    }

    const pendingEntries = entries().filter((entry) => entry.finishedAt === null);
    expect(
      pendingEntries,
      `Timed out waiting for tracked API traffic to settle. Pending: ${pendingEntries
        .map((entry) => `${entry.method} ${entry.pathname}${entry.search}`)
        .join(", ")}`,
    ).toEqual([]);
  }

  page.on("request", handleRequest);
  page.on("response", handleResponse);
  page.on("requestfinished", handleRequestFinished);
  page.on("requestfailed", handleRequestFailed);

  return {
    dispose() {
      page.off("request", handleRequest);
      page.off("response", handleResponse);
      page.off("requestfinished", handleRequestFinished);
      page.off("requestfailed", handleRequestFailed);
    },

    entries,

    latestEntry() {
      return entries().at(-1) ?? null;
    },

    reset() {
      trackedEntries.clear();
      orderedRequests.splice(0, orderedRequests.length);
      pendingRequests.clear();
      markActivity();
    },

    waitForSettled,
  };
}
