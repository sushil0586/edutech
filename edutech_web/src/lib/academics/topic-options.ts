type TopicLike = {
  id: string;
  name: string;
  code: string;
  sort_order?: number | null;
};

export function sortTopicOptions<T extends TopicLike>(topics: T[]) {
  return [...topics].sort((left, right) => {
    const leftSortOrder = Number(left.sort_order ?? 0);
    const rightSortOrder = Number(right.sort_order ?? 0);

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    const nameOrder = left.name.localeCompare(right.name);
    if (nameOrder !== 0) {
      return nameOrder;
    }

    const codeOrder = left.code.localeCompare(right.code);
    if (codeOrder !== 0) {
      return codeOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

export function formatTopicOptionLabel(topic: Pick<TopicLike, "name" | "code">) {
  const normalizedName = topic.name.trim();
  const normalizedCode = topic.code.trim();

  if (!normalizedCode) {
    return normalizedName;
  }

  return `${normalizedName} (${normalizedCode})`;
}
