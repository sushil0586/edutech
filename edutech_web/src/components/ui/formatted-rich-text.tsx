"use client";

import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${match.index}-bold`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={`${match.index}-italic`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function FormattedRichText({
  className = "",
  emptyFallback,
  text,
}: {
  className?: string;
  emptyFallback?: ReactNode;
  text: string;
}) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  const blocks = normalized.split(/\n\s*\n/);

  return (
    <div className={`formattedRichText ${className}`.trim()}>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) {
          return null;
        }

        if (trimmed === "---") {
          return <hr key={`hr-${index}`} />;
        }

        const lines = trimmed.split("\n");
        const allUnordered = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        if (allUnordered) {
          return (
            <ul key={`ul-${index}`}>
              {lines.map((line, lineIndex) => (
                <li key={`ul-${index}-${lineIndex}`}>{renderInline(line.trim().replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        const allOrdered = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
        if (allOrdered) {
          return (
            <ol key={`ol-${index}`}>
              {lines.map((line, lineIndex) => (
                <li key={`ol-${index}-${lineIndex}`}>{renderInline(line.trim().replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        const allQuote = lines.every((line) => /^>\s?/.test(line.trim()));
        if (allQuote) {
          return (
            <blockquote key={`quote-${index}`}>
              {lines.map((line, lineIndex) => (
                <p key={`quote-${index}-${lineIndex}`}>{renderInline(line.trim().replace(/^>\s?/, ""))}</p>
              ))}
            </blockquote>
          );
        }

        const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const content = renderInline(headingMatch[2]);
          if (level === 1) {
            return <h1 key={`h1-${index}`}>{content}</h1>;
          }
          if (level === 2) {
            return <h2 key={`h2-${index}`}>{content}</h2>;
          }
          return <h3 key={`h3-${index}`}>{content}</h3>;
        }

        return (
          <p key={`p-${index}`}>
            {lines.map((line, lineIndex) => (
              <span key={`line-${index}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
