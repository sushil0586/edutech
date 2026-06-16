import type { TeacherOptionCatalogEntry } from "@/lib/api/teacher-builder";

export type CatalogSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function groupTeacherOptionCatalog(entries: TeacherOptionCatalogEntry[]) {
  const namespaceMap = new Map<string, TeacherOptionCatalogEntry[]>();

  for (const entry of entries) {
    const current = namespaceMap.get(entry.namespace) ?? [];
    current.push(entry);
    namespaceMap.set(entry.namespace, current);
  }

  for (const [namespace, items] of namespaceMap.entries()) {
    namespaceMap.set(
      namespace,
      items
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label)),
    );
  }

  function list(namespace: string): TeacherOptionCatalogEntry[] {
    return namespaceMap.get(namespace) ?? [];
  }

  function selectOptions(namespace: string): CatalogSelectOption[] {
    return list(namespace).map((entry) => ({
      value: entry.code,
      label: entry.label,
      description: entry.description,
    }));
  }

  function labelMap(namespace: string): Record<string, string> {
    return Object.fromEntries(list(namespace).map((entry) => [entry.code, entry.label]));
  }

  function defaultCode(namespace: string, fallback = ""): string {
    const options = list(namespace);
    const explicitDefault = options.find((entry) => entry.is_default);
    if (explicitDefault) {
      return explicitDefault.code;
    }
    return options[0]?.code ?? fallback;
  }

  return {
    list,
    selectOptions,
    labelMap,
    defaultCode,
  };
}

export function formatCatalogLabel(code: string, labels: Record<string, string>) {
  return labels[code] ?? code.replaceAll("_", " ");
}
