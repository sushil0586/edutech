import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import playwrightPkg from "../../../edutech_web/node_modules/playwright/index.js";

const { chromium } = playwrightPkg;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const manualPath = path.join(rootDir, "docs", "user-manual", "EXAM_CREATION_AND_BUILDER_USER_MANUAL.md");
const pdfPath = path.join(rootDir, "docs", "user-manual", "pdfs", "exam-creation-and-builder.pdf");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineText(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let ul = null;
  let ol = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushLists = () => {
    if (ul) {
      blocks.push({ type: "ul", items: ul });
      ul = null;
    }
    if (ol) {
      blocks.push({ type: "ol", items: ol });
      ol = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushLists();
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushLists();
      blocks.push({ type: "h1", text: trimmed.slice(2).trim() });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushLists();
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushLists();
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      continue;
    }
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushLists();
      blocks.push({ type: "image", alt: imageMatch[1], src: imageMatch[2] });
      continue;
    }
    if (/^- /.test(trimmed)) {
      flushParagraph();
      if (!ul) ul = [];
      ul.push(trimmed.slice(2).trim());
      continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      flushParagraph();
      if (!ol) ol = [];
      ol.push(trimmed.replace(/^\d+\. /, ""));
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushLists();
  return blocks;
}

function resolveImagePath(src) {
  const normalized = src.replace(/^\.\//, "");
  return path.resolve(path.dirname(manualPath), normalized);
}

async function renderPdf() {
  const markdown = await fs.readFile(manualPath, "utf8");
  const blocks = parseMarkdown(markdown);
  const body = [];
  body.push(`<section class="cover"><div class="eyebrow">Nexora Workflow Manual</div><h1>Exam Creation And Builder</h1><p>A polished walkthrough for teachers and institute admins. This guide follows the live create-exam and builder experience with screenshots for scope selection, section setup, question linking, and student assignment.</p></section>`);

  for (const block of blocks) {
    if (block.type === "h1") {
      body.push(`<h1>${inlineText(block.text)}</h1>`);
    } else if (block.type === "h2") {
      body.push(`<h2>${inlineText(block.text)}</h2>`);
    } else if (block.type === "h3") {
      body.push(`<h3>${inlineText(block.text)}</h3>`);
    } else if (block.type === "paragraph") {
      body.push(`<p>${inlineText(block.text)}</p>`);
    } else if (block.type === "ul") {
      body.push(`<ul>${block.items.map((item) => `<li>${inlineText(item)}</li>`).join("")}</ul>`);
    } else if (block.type === "ol") {
      body.push(`<ol>${block.items.map((item) => `<li>${inlineText(item)}</li>`).join("")}</ol>`);
    } else if (block.type === "image") {
      const absolute = resolveImagePath(block.src);
      const buffer = await fs.readFile(absolute);
      const ext = path.extname(absolute).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
      body.push(`<figure><img alt="${escapeHtml(block.alt)}" src="data:${mime};base64,${buffer.toString("base64")}" /><figcaption>${escapeHtml(block.alt)}</figcaption></figure>`);
    }
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Exam Creation And Builder</title>
      <style>
        @page { size: A4; margin: 16mm 15mm 16mm 15mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f6f7fb;
          color: #1f2937;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          line-height: 1.55;
        }
        .sheet {
          background: white;
          padding: 0 0 8mm 0;
        }
        .cover {
          padding: 24mm 16mm 10mm 16mm;
          margin-bottom: 8mm;
          background: linear-gradient(135deg, #091a35 0%, #1d4ed8 55%, #7c3aed 100%);
          color: white;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          opacity: 0.85;
          margin-bottom: 10px;
        }
        h1, h2, h3 {
          line-height: 1.2;
          margin: 0 0 10px;
          color: #111827;
        }
        .cover h1 {
          font-size: 30px;
          color: white;
          margin-bottom: 14px;
        }
        .cover p {
          font-size: 15px;
          max-width: 65ch;
          color: rgba(255,255,255,0.92);
        }
        h2 {
          font-size: 20px;
          margin-top: 16px;
          padding-top: 6px;
          border-top: 1px solid #e5e7eb;
        }
        h3 { font-size: 15px; margin-top: 10px; }
        p, li { font-size: 12.5px; }
        ul, ol { padding-left: 20px; margin: 0 0 12px; }
        li { margin: 3px 0; }
        figure {
          margin: 14px 0 12px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fafafa;
          page-break-inside: avoid;
        }
        img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }
        figcaption {
          margin-top: 8px;
          font-size: 11px;
          color: #6b7280;
        }
        code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 0 5px;
          border-radius: 6px;
          font-size: 0.95em;
        }
        a {
          color: #4338ca;
          text-decoration: none;
        }
      </style>
    </head>
    <body><div class="sheet">${body.join("\\n")}</div></body>
  </html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
  await browser.close();
}

renderPdf().catch((error) => {
  console.error(error);
  process.exit(1);
});
