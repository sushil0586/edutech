import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import playwrightPkg from "../../../edutech_web/node_modules/playwright/index.js";

const { chromium } = playwrightPkg;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const roleDir = path.join(rootDir, "docs", "user-manual", "role-guides");
const pdfDir = path.join(rootDir, "docs", "user-manual", "pdfs");
const outputImageRoot = path.join(rootDir, "docs", "user-manual", "assets", "role-guides");

const roleFiles = [
  { key: "platform-admin", file: "platform-admin.md", title: "Platform Admin User Guide", folder: "admin" },
  { key: "institute-admin", file: "institute-admin.md", title: "Institute Admin User Guide", folder: "institute" },
  { key: "teacher", file: "teacher.md", title: "Teacher User Guide", folder: "teacher" },
  { key: "student", file: "student.md", title: "Student User Guide", folder: "student" },
  { key: "parent", file: "parent.md", title: "Parent User Guide", folder: "parent" },
];

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
  let currentParagraph = [];
  let currentList = null;
  let currentOrderedList = null;
  let currentSection = null;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", text: currentParagraph.join(" ") });
      currentParagraph = [];
    }
  };

  const flushLists = () => {
    if (currentList) {
      blocks.push({ type: "ul", items: currentList });
      currentList = null;
    }
    if (currentOrderedList) {
      blocks.push({ type: "ol", items: currentOrderedList });
      currentOrderedList = null;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
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
      currentSection = trimmed.slice(3).trim();
      blocks.push({ type: "h2", text: currentSection });
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
      if (!currentList) currentList = [];
      currentList.push(trimmed.slice(2).trim());
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      flushParagraph();
      if (!currentOrderedList) currentOrderedList = [];
      currentOrderedList.push(trimmed.replace(/^\d+\. /, ""));
      continue;
    }

    if (currentSection && line.startsWith("  ")) {
      currentParagraph.push(trimmed);
      continue;
    }

    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushLists();
  return blocks;
}

async function imageToDataUri(relativePath) {
  const absolute = path.join(rootDir, "docs", "user-manual", relativePath.replace(/^\.\.\//, ""));
  const buffer = await fs.readFile(absolute);
  const ext = path.extname(absolute).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function renderRolePdf(page, role) {
  const markdown = await fs.readFile(path.join(roleDir, role.file), "utf8");
  const blocks = parseMarkdown(markdown);
  const body = [];
  body.push(`<section class="cover"><div class="eyebrow">Nexora Role Guide</div><h1>${escapeHtml(role.title)}</h1><p>Polished user guide for the ${escapeHtml(role.title.replace(" User Guide", "").toLowerCase())} workspace. Includes menu maps, screenshots, and practical workflows.</p></section>`);

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
      const rawPath = block.src.replace(/^\.\.\//, "");
      const absoluteImage = path.join(rootDir, "docs", "user-manual", rawPath);
      const imageBuffer = await fs.readFile(absoluteImage);
      const ext = path.extname(absoluteImage).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" :
        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
        ext === ".webp" ? "image/webp" :
        "application/octet-stream";
      const dataUri = `data:${mime};base64,${imageBuffer.toString("base64")}`;
      body.push(`<figure><img alt="${escapeHtml(block.alt)}" src="${dataUri}" /><figcaption>${escapeHtml(block.alt)}</figcaption></figure>`);
    }
  }

  const imageIndex = await fs.readdir(path.join(outputImageRoot, role.folder)).catch(() => []);
  const extraImages = imageIndex.length
    ? `<section class="appendix"><h2>Screenshot Library</h2><p>Additional captures from the live workspace.</p><div class="imageGrid">${(await Promise.all(
        imageIndex
          .filter((name) => /\.png$/i.test(name))
          .map(async (name) => {
            const full = path.join(outputImageRoot, role.folder, name);
            const buffer = await fs.readFile(full);
            return `<figure><img src="data:image/png;base64,${buffer.toString("base64")}" alt="${escapeHtml(name)}" /><figcaption>${escapeHtml(name)}</figcaption></figure>`;
          }),
      )).join("")}</div></section>`
    : "";

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(role.title)}</title>
      <style>
        @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #1f2937;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          line-height: 1.55;
          background: #f7f7fb;
        }
        .page {
          padding: 0;
        }
        .sheet {
          background: white;
          padding: 0 0 8mm 0;
        }
        .cover {
          padding: 24mm 16mm 10mm 16mm;
          margin-bottom: 8mm;
          background: linear-gradient(135deg, #101828 0%, #253858 55%, #4f46e5 100%);
          color: white;
          border-radius: 0 0 18px 18px;
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
          margin-bottom: 14px;
          color: white;
        }
        .cover p {
          font-size: 15px;
          max-width: 60ch;
          color: rgba(255,255,255,0.92);
        }
        h2 {
          font-size: 20px;
          margin-top: 16px;
          padding-top: 6px;
          border-top: 1px solid #e5e7eb;
        }
        h3 {
          font-size: 15px;
          margin-top: 10px;
        }
        p, li {
          font-size: 12.5px;
        }
        ul, ol {
          padding-left: 20px;
          margin: 0 0 12px;
        }
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
          border-radius: 10px;
          display: block;
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
        .appendix {
          margin-top: 18px;
          page-break-before: always;
        }
        .imageGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="sheet">
          ${body.join("\n")}
          ${extraImages}
        </div>
      </div>
    </body>
  </html>`;

  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: path.join(pdfDir, `${role.key}.pdf`),
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
}

async function main() {
  await fs.mkdir(pdfDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });

  for (const role of roleFiles) {
    await renderRolePdf(page, role);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
