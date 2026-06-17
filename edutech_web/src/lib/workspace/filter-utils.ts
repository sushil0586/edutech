export function formatFilterValue(value: string) {
  return value.replaceAll("_", " ");
}

export function resolveFilterValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function buildFilterHref(
  basePath: string,
  entries: Array<[key: string, value: string | null | undefined, defaultValue?: string]>,
) {
  const params = new URLSearchParams();

  for (const [key, value, defaultValue] of entries) {
    if (!value) continue;
    if (defaultValue !== undefined && value === defaultValue) continue;
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
