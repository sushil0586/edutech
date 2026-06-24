"use client";

import { useRef, useState } from "react";
import { FormattedRichText } from "@/components/ui/formatted-rich-text";

type ToolbarAction = {
  label: string;
  title: string;
  apply: (value: string, start: number, end: number) => {
    nextValue: string;
    selectionStart: number;
    selectionEnd: number;
  };
};

function wrapSelection(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix = prefix,
) {
  const selected = value.slice(start, end) || "text";
  const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  return {
    nextValue,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

function prefixLines(value: string, start: number, end: number, prefix: string) {
  const blockStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const blockEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(blockStart, blockEnd);
  const updated = block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  const nextValue = `${value.slice(0, blockStart)}${updated}${value.slice(blockEnd)}`;
  return {
    nextValue,
    selectionStart: blockStart,
    selectionEnd: blockStart + updated.length,
  };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "Bold",
    title: "Bold",
    apply: (value, start, end) => wrapSelection(value, start, end, "**"),
  },
  {
    label: "Italic",
    title: "Italic",
    apply: (value, start, end) => wrapSelection(value, start, end, "*"),
  },
  {
    label: "Heading",
    title: "Heading",
    apply: (value, start, end) => prefixLines(value, start, end, "## "),
  },
  {
    label: "Bullets",
    title: "Bulleted list",
    apply: (value, start, end) => prefixLines(value, start, end, "- "),
  },
  {
    label: "Numbered",
    title: "Numbered list",
    apply: (value, start, end) => prefixLines(value, start, end, "1. "),
  },
  {
    label: "Quote",
    title: "Quote block",
    apply: (value, start, end) => prefixLines(value, start, end, "> "),
  },
];

export function RichTextTextarea({
  defaultValue = "",
  helperText,
  name,
  onChange,
  placeholder,
  previewLabel = "Preview",
  required = false,
  rows = 8,
  value: controlledValue,
}: {
  defaultValue?: string;
  helperText?: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  previewLabel?: string;
  required?: boolean;
  rows?: number;
  value?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const value = controlledValue ?? internalValue;

  function updateValue(nextValue: string) {
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }

  function runAction(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const result = action.apply(value, start, end);
    updateValue(result.nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="richTextField">
      <div className="richTextToolbar" role="toolbar" aria-label={`${name} formatting controls`}>
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            className="button buttonGhost richTextToolbarButton"
            key={action.label}
            onClick={(event) => {
              event.preventDefault();
              runAction(action);
            }}
            title={action.title}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>

      <textarea
        className="richTextTextarea"
        name={name}
        onChange={(event) => updateValue(event.target.value)}
        placeholder={placeholder}
        ref={textareaRef}
        required={required}
        rows={rows}
        value={value}
      />

      <div className="richTextFootnote">
        <span>{helperText || "Use the toolbar for bold, headings, and lists. Markdown is rendered in the preview and reading popup."}</span>
      </div>

      <div className="richTextPreview">
        <div className="richTextPreviewHeader">
          <strong>{previewLabel}</strong>
          <span>Rendered exactly as readers will see it.</span>
        </div>
        <div className="richTextPreviewBody">
          <FormattedRichText
            emptyFallback={<p className="emptyText">Start typing to preview the formatted content.</p>}
            text={value}
          />
        </div>
      </div>
    </div>
  );
}
