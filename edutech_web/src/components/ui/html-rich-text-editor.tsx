"use client";

import { useEffect, useId, useRef, useState } from "react";
import { validateImageUpload } from "@/lib/http/upload-validation";

type FormatBlockValue = "p" | "h1" | "h2" | "h3" | "blockquote";
type TextAlignValue = "left" | "center" | "right";
type ImageSizeValue = "small" | "medium" | "full";

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  block: FormatBlockValue;
  align: TextAlignValue;
};

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  block: "p",
  align: "left",
};

function getSelectedImage(editor: HTMLDivElement | null) {
  if (!editor) {
    return null;
  }

  const selection = window.getSelection();
  const anchorNode = selection?.anchorNode ?? null;
  const directImage =
    anchorNode instanceof HTMLImageElement
      ? anchorNode
      : anchorNode?.parentElement instanceof HTMLImageElement
        ? anchorNode.parentElement
        : null;

  if (directImage && editor.contains(directImage)) {
    return directImage;
  }

  const commonAncestor =
    selection?.rangeCount ? selection.getRangeAt(0).commonAncestorContainer : null;
  const elementNode = commonAncestor instanceof Element ? commonAncestor : null;
  const parentImage = elementNode?.closest("img");
  return parentImage instanceof HTMLImageElement && editor.contains(parentImage) ? parentImage : null;
}

function buildFigureMarkup({
  src,
  alt,
  title,
  caption,
  width = 420,
}: {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
}) {
  const escapedSrc = src.replaceAll('"', "&quot;");
  const escapedAlt = alt.replaceAll('"', "&quot;");
  const escapedTitle = (title || "").replaceAll('"', "&quot;");
  const trimmedCaption = (caption || "").trim();
  return `<figure data-align="center"><img src="${escapedSrc}" alt="${escapedAlt}" title="${escapedTitle}" data-size="medium" data-align="center" width="${width}">${trimmedCaption ? `<figcaption>${trimmedCaption.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</figcaption>` : ""}</figure>`;
}

function normalizeEditorHtml(value: string) {
  const normalized = value
    .replace(/<div><br><\/div>/gi, "<br>")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return normalized === "<br>" ? "" : normalized;
}

function hasVisibleText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length > 0;
}

export function HtmlRichTextEditor({
  helperText,
  name,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  helperText?: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const [toolbarState, setToolbarState] = useState<ToolbarState>(DEFAULT_TOOLBAR_STATE);
  const [uploadError, setUploadError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageState, setSelectedImageState] = useState<{
    size: ImageSizeValue;
    align: TextAlignValue;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const nextHtml = value || "";
    if (editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    function syncToolbarState() {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const selection = window.getSelection();
      if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) {
        return;
      }

      const block = (document.queryCommandValue("formatBlock") || "").toString().toLowerCase();
      const normalizedBlock: FormatBlockValue =
        block === "h1" || block === "h2" || block === "h3" || block === "blockquote" ? block : "p";

      const align: TextAlignValue = document.queryCommandState("justifyCenter")
        ? "center"
        : document.queryCommandState("justifyRight")
          ? "right"
          : "left";

      setToolbarState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
        block: normalizedBlock,
        align,
      });

      const image = getSelectedImage(editor);
      setSelectedImageState(
        image
          ? {
              size: (image.dataset.size as ImageSizeValue) || "medium",
              align: (image.dataset.align as TextAlignValue) || "center",
              width: Number(image.getAttribute("width") || "420") || 420,
            }
          : null,
      );
    }

    document.addEventListener("selectionchange", syncToolbarState);
    return () => document.removeEventListener("selectionchange", syncToolbarState);
  }, []);

  function syncValueFromEditor() {
    if (!editorRef.current) {
      return;
    }
    onChange(normalizeEditorHtml(editorRef.current.innerHTML));
  }

  function refreshSelectionState() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const image = getSelectedImage(editor);
    setSelectedImageState(
      image
        ? {
            size: (image.dataset.size as ImageSizeValue) || "medium",
            align: (image.dataset.align as TextAlignValue) || "center",
            width: Number(image.getAttribute("width") || "420") || 420,
          }
        : null,
    );
  }

  function runCommand(command: string, commandValue?: string) {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    syncValueFromEditor();
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (selection?.anchorNode && editorRef.current?.contains(selection.anchorNode)) {
        const block = (document.queryCommandValue("formatBlock") || "").toString().toLowerCase();
        setToolbarState({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          unorderedList: document.queryCommandState("insertUnorderedList"),
          orderedList: document.queryCommandState("insertOrderedList"),
          block:
            block === "h1" || block === "h2" || block === "h3" || block === "blockquote"
              ? block
              : "p",
          align: document.queryCommandState("justifyCenter")
            ? "center"
            : document.queryCommandState("justifyRight")
              ? "right"
              : "left",
        });
      }
    });
  }

  function handleLink() {
    const url = window.prompt("Enter link URL", "https://");
    if (!url) {
      return;
    }
    runCommand("createLink", url);
  }

  function handleImage() {
    setUploadError("");
    fileInputRef.current?.click();
  }

  async function handleImageUpload(file: File) {
    const fileError = validateImageUpload(file);
    if (fileError) {
      setUploadError(fileError);
      return;
    }

    const alt = window.prompt("Enter image alt text", "Passage illustration") || "";
    const title = window.prompt("Enter image title (optional)", "") || "";
    const caption = window.prompt("Enter image caption (optional)", "") || "";
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt_text", alt);
    formData.set("title", title);

    setIsUploadingImage(true);
    setUploadError("");
    try {
      const response = await fetch("/api/question-bank/rich-text-image-upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        file_url?: string;
        alt_text?: string;
        title?: string;
      };
      if (!response.ok || !payload.file_url) {
        setUploadError(payload.detail || "Unable to upload the image right now.");
        return;
      }
      if (!editorRef.current) {
        return;
      }
      editorRef.current.focus();
      document.execCommand(
        "insertHTML",
        false,
        buildFigureMarkup({
          src: payload.file_url,
          alt: payload.alt_text || "",
          title: payload.title || "",
          caption,
        }),
      );
      syncValueFromEditor();
      refreshSelectionState();
    } catch {
      setUploadError("Unable to upload the image right now.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleImageUrl() {
    const src = window.prompt("Enter image URL", "https://");
    if (!src) {
      return;
    }
    const alt = window.prompt("Enter image alt text", "Passage illustration") || "";
    const caption = window.prompt("Enter image caption (optional)", "") || "";
    if (!editorRef.current) {
      return;
    }
    editorRef.current.focus();
    document.execCommand(
      "insertHTML",
      false,
      buildFigureMarkup({ src, alt, caption }),
    );
    syncValueFromEditor();
    refreshSelectionState();
  }

  function updateSelectedImageLayout(next: Partial<{ size: ImageSizeValue; align: TextAlignValue }>) {
    const image = getSelectedImage(editorRef.current);
    if (!image) {
      return;
    }
    const figure = image.closest("figure");

    if (next.size) {
      image.dataset.size = next.size;
      if (next.size === "small") {
        image.setAttribute("width", "220");
      } else if (next.size === "medium") {
        image.setAttribute("width", "420");
      } else if (next.size === "full") {
        image.setAttribute("width", "720");
      }
    }
    if (next.align) {
      image.dataset.align = next.align;
      if (figure) {
        figure.dataset.align = next.align;
      }
    }

    syncValueFromEditor();
    refreshSelectionState();
  }

  function updateSelectedImageWidth(width: number) {
    const image = getSelectedImage(editorRef.current);
    if (!image) {
      return;
    }
    image.setAttribute("width", String(width));
    if (width <= 260) {
      image.dataset.size = "small";
    } else if (width >= 600) {
      image.dataset.size = "full";
    } else {
      image.dataset.size = "medium";
    }
    syncValueFromEditor();
    refreshSelectionState();
  }

  function editSelectedImageCaption() {
    const image = getSelectedImage(editorRef.current);
    if (!image) {
      return;
    }
    const figure = image.closest("figure");
    const figcaption = figure?.querySelector("figcaption");
    const currentCaption = figcaption?.textContent?.trim() || "";
    const nextCaption = window.prompt("Edit image caption", currentCaption);
    if (nextCaption === null) {
      return;
    }
    if (figure) {
      if (figcaption) {
        if (nextCaption.trim()) {
          figcaption.textContent = nextCaption.trim();
        } else {
          figcaption.remove();
        }
      } else if (nextCaption.trim()) {
        const nextFigcaption = document.createElement("figcaption");
        nextFigcaption.textContent = nextCaption.trim();
        figure.appendChild(nextFigcaption);
      }
    }
    syncValueFromEditor();
    refreshSelectionState();
  }

  return (
    <div className="richTextField">
      <div className="htmlRichTextEditorShell">
        <div className="htmlRichTextToolbar" role="toolbar" aria-label={`${name} rich text controls`}>
          <div className="htmlRichTextToolbarGroup">
            <button className={`richTextToolbarIconButton${toolbarState.bold ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("bold"); }} title="Bold" type="button"><strong>B</strong></button>
            <button className={`richTextToolbarIconButton richTextToolbarIconButtonSerif${toolbarState.italic ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("italic"); }} title="Italic" type="button"><em>I</em></button>
            <button className={`richTextToolbarIconButton${toolbarState.underline ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("underline"); }} title="Underline" type="button"><span className="richTextUnderlineSample">U</span></button>
          </div>

          <span aria-hidden="true" className="richTextToolbarDivider" />

          <div className="htmlRichTextToolbarGroup">
            <select
              className="richTextToolbarSelect"
              onChange={(event) => runCommand("formatBlock", `<${event.target.value as FormatBlockValue}>`)}
              value={toolbarState.block}
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
            </select>
            <button className={`richTextToolbarIconButton richTextToolbarWideButton${toolbarState.unorderedList ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("insertUnorderedList"); }} title="Bulleted list" type="button">• List</button>
            <button className={`richTextToolbarIconButton richTextToolbarWideButton${toolbarState.orderedList ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("insertOrderedList"); }} title="Numbered list" type="button">1. List</button>
          </div>

          <span aria-hidden="true" className="richTextToolbarDivider" />

          <div className="htmlRichTextToolbarGroup">
            <button className={`richTextToolbarIconButton${toolbarState.align === "left" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("justifyLeft"); }} title="Align left" type="button">L</button>
            <button className={`richTextToolbarIconButton${toolbarState.align === "center" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("justifyCenter"); }} title="Align center" type="button">C</button>
            <button className={`richTextToolbarIconButton${toolbarState.align === "right" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); runCommand("justifyRight"); }} title="Align right" type="button">R</button>
          </div>

          <span aria-hidden="true" className="richTextToolbarDivider" />

          <div className="htmlRichTextToolbarGroup">
            <button className="richTextToolbarIconButton richTextToolbarWideButton" disabled={isUploadingImage} onClick={(event) => { event.preventDefault(); handleImage(); }} title="Upload image" type="button">{isUploadingImage ? "Uploading..." : "Upload"}</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); handleImageUrl(); }} title="Insert image by URL" type="button">Image URL</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); handleLink(); }} title="Insert link" type="button">Link</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); runCommand("unlink"); }} title="Remove link" type="button">Unlink</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); runCommand("removeFormat"); }} title="Clear formatting" type="button">Clear</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); runCommand("undo"); }} title="Undo" type="button">Undo</button>
            <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); runCommand("redo"); }} title="Redo" type="button">Redo</button>
          </div>
        </div>

        {selectedImageState ? (
          <div className="htmlRichImageToolbar" role="toolbar" aria-label="Selected image controls">
            <div className="htmlRichTextToolbarGroup">
              <span className="richTextImageLabel">Image</span>
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.size === "small" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ size: "small" }); }} type="button">Small</button>
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.size === "medium" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ size: "medium" }); }} type="button">Medium</button>
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.size === "full" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ size: "full" }); }} type="button">Full</button>
              <button className="richTextToolbarIconButton richTextToolbarWideButton" onClick={(event) => { event.preventDefault(); editSelectedImageCaption(); }} type="button">Caption</button>
            </div>
            <span aria-hidden="true" className="richTextToolbarDivider" />
            <div className="htmlRichTextToolbarGroup">
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.align === "left" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ align: "left" }); }} type="button">Left</button>
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.align === "center" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ align: "center" }); }} type="button">Center</button>
              <button className={`richTextToolbarIconButton richTextToolbarWideButton${selectedImageState.align === "right" ? " richTextToolbarIconButtonActive" : ""}`} onClick={(event) => { event.preventDefault(); updateSelectedImageLayout({ align: "right" }); }} type="button">Right</button>
            </div>
            <span aria-hidden="true" className="richTextToolbarDivider" />
            <div className="htmlRichTextToolbarGroup richTextImageRangeGroup">
              <span className="richTextImageLabel">Width</span>
              <input
                className="richTextImageRange"
                max="720"
                min="120"
                onChange={(event) => updateSelectedImageWidth(Number(event.target.value))}
                type="range"
                value={selectedImageState.width}
              />
              <span className="richTextImageRangeValue">{selectedImageState.width}px</span>
            </div>
          </div>
        ) : null}

        <input
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
          className="richTextHiddenValue"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImageUpload(file);
            }
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />

        <input
          className="richTextHiddenValue"
          id={inputId}
          name={name}
          readOnly
          required={required}
          tabIndex={-1}
          value={hasVisibleText(value) ? value : ""}
        />

        <div
          aria-labelledby={inputId}
          className="htmlRichTextSurface"
          contentEditable
          data-placeholder={placeholder || ""}
          onBlur={syncValueFromEditor}
          onInput={syncValueFromEditor}
          onMouseUp={refreshSelectionState}
          onKeyUp={refreshSelectionState}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>

      <div className="richTextFootnote">
        <span>{helperText || "Visual editor mode saves rich HTML. The backend sanitizes unsupported tags before storing it."}</span>
        {uploadError ? <span className="richTextError">{uploadError}</span> : null}
      </div>
    </div>
  );
}
