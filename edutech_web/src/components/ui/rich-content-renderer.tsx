"use client";

import type { ReactNode } from "react";
import { FormattedRichText } from "@/components/ui/formatted-rich-text";

export function RichContentRenderer({
  className = "",
  emptyFallback,
  format,
  text,
}: {
  className?: string;
  emptyFallback?: ReactNode;
  format?: string | null;
  text: string;
}) {
  const normalized = text.trim();
  if (!normalized) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  if (format === "rich_text_html") {
    return (
      <div
        className={`formattedRichText ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    );
  }

  return <FormattedRichText className={className} emptyFallback={emptyFallback} text={text} />;
}
