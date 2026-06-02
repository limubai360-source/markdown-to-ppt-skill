#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Module = require("module");

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

function usage() {
  console.error("Usage: node html_to_pptx.js <slides.html> <slides.pptx>");
}

function resolvePptxgen() {
  const candidates = [];
  if (process.env.NODE_PATH) {
    candidates.push(...process.env.NODE_PATH.split(path.delimiter).filter(Boolean));
  }
  candidates.push(path.join(process.cwd(), "node_modules"));
  candidates.push(path.join(__dirname, "..", "node_modules"));
  candidates.push(path.join(process.env.HOME || "", ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"));

  for (const candidate of candidates) {
    try {
      return require(require.resolve("pptxgenjs", { paths: [candidate] }));
    } catch (_) {
      // Try the next candidate.
    }
  }

  try {
    Module._initPaths();
    return require("pptxgenjs");
  } catch (_) {
    return null;
  }
}

function extractPptxSpec(html) {
  const match = html.match(
    /<script\b[^>]*\bid=["']pptx-spec["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return null;
  return JSON.parse(match[1].trim());
}

function normalizeColor(value, fallback = "111827") {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.slice(1);
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  return fallback;
}

function clampNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function addText(slide, element) {
  slide.addText(String(element.text || ""), {
    x: clampNumber(element.x, 0.7),
    y: clampNumber(element.y, 0.7),
    w: clampNumber(element.w, 11.9),
    h: clampNumber(element.h, 0.5),
    fontFace: element.fontFace || "Aptos",
    fontSize: clampNumber(element.fontSize, 18),
    color: normalizeColor(element.color),
    bold: Boolean(element.bold),
    italic: Boolean(element.italic),
    align: element.align || "left",
    valign: element.valign || "top",
    margin: 0,
    breakLine: Boolean(element.breakLine),
    fit: "shrink",
  });
}

function addCard(pptx, slide, element) {
  const x = clampNumber(element.x, 0.7);
  const y = clampNumber(element.y, 1.2);
  const w = clampNumber(element.w, 3.2);
  const h = clampNumber(element.h, 1.4);
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: clampNumber(element.radius, 0.12),
    fill: { color: normalizeColor(element.fill, "FFFFFF") },
    line: { color: normalizeColor(element.line, "E5E7EB"), width: 1 },
  });

  if (element.title) {
    slide.addText(String(element.title), {
      x: x + 0.18,
      y: y + 0.16,
      w: Math.max(w - 0.36, 0.2),
      h: 0.28,
      fontFace: element.fontFace || "Aptos",
      fontSize: clampNumber(element.titleSize, 13),
      bold: true,
      color: normalizeColor(element.titleColor, "111827"),
      margin: 0,
      fit: "shrink",
    });
  }

  if (element.body) {
    slide.addText(String(element.body), {
      x: x + 0.18,
      y: y + (element.title ? 0.55 : 0.18),
      w: Math.max(w - 0.36, 0.2),
      h: Math.max(h - (element.title ? 0.72 : 0.36), 0.2),
      fontFace: element.fontFace || "Aptos",
      fontSize: clampNumber(element.bodySize, 10.5),
      color: normalizeColor(element.bodyColor, "4B5563"),
      valign: "top",
      margin: 0,
      breakLine: false,
      fit: "shrink",
    });
  }
}

function addTag(slide, element) {
  slide.addText(String(element.text || ""), {
    x: clampNumber(element.x, 0.7),
    y: clampNumber(element.y, 0.7),
    w: clampNumber(element.w, 1.4),
    h: clampNumber(element.h, 0.32),
    fontFace: element.fontFace || "Aptos",
    fontSize: clampNumber(element.fontSize, 10),
    color: normalizeColor(element.color, "2563EB"),
    bold: Boolean(element.bold),
    align: "center",
    valign: "mid",
    fill: { color: normalizeColor(element.fill, "EFF6FF") },
    line: { color: normalizeColor(element.line, "BFDBFE"), transparency: 40 },
    margin: 0.03,
    fit: "shrink",
  });
}

function addShape(pptx, slide, element) {
  const shapeName = element.shape === "ellipse" ? pptx.ShapeType.ellipse : pptx.ShapeType.rect;
  slide.addShape(shapeName, {
    x: clampNumber(element.x, 0.7),
    y: clampNumber(element.y, 0.7),
    w: clampNumber(element.w, 1),
    h: clampNumber(element.h, 1),
    fill: { color: normalizeColor(element.fill, "F3F4F6"), transparency: clampNumber(element.transparency, 0) },
    line: { color: normalizeColor(element.line, "E5E7EB"), width: clampNumber(element.lineWidth, 1) },
  });
}

function addLine(pptx, slide, element) {
  const options = {
    x: clampNumber(element.x, 0.7),
    y: clampNumber(element.y, 0.7),
    w: clampNumber(element.w, 1),
    h: clampNumber(element.h, 0),
    line: {
      color: normalizeColor(element.color, "CBD5E1"),
      width: clampNumber(element.width, 1),
    },
  };
  if (element.arrow && pptx.ArrowType) {
    options.line.endArrowType = pptx.ArrowType.triangle;
  }
  slide.addShape(pptx.ShapeType.line, options);
}

function renderElement(pptx, slide, element) {
  switch (element.kind) {
    case "text":
      addText(slide, element);
      break;
    case "card":
      addCard(pptx, slide, element);
      break;
    case "tag":
      addTag(slide, element);
      break;
    case "shape":
      addShape(pptx, slide, element);
      break;
    case "line":
      addLine(pptx, slide, element);
      break;
    default:
      console.warn(`[WARN] Unsupported element kind ignored: ${element.kind}`);
  }
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    usage();
    process.exit(2);
  }

  const PptxGenJS = resolvePptxgen();
  if (!PptxGenJS) {
    console.error("[FAIL] Cannot find pptxgenjs.");
    console.error("Install it in the current project with: npm install pptxgenjs");
    console.error("Or set NODE_PATH to a node_modules directory that contains pptxgenjs.");
    process.exit(1);
  }

  const htmlPath = path.resolve(input);
  const outputPath = path.resolve(output);
  const html = fs.readFileSync(htmlPath, "utf8");
  const spec = extractPptxSpec(html);

  if (!spec || !Array.isArray(spec.slides)) {
    console.error("[FAIL] Missing valid pptx-spec.slides in HTML.");
    process.exit(1);
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = spec.author || "markdown-to-ppt";
  pptx.subject = spec.subject || "Generated from Markdown HTML slide draft";
  pptx.title = spec.title || "Markdown to PPT";
  pptx.company = spec.company || "";
  pptx.lang = spec.lang || "zh-CN";
  pptx.theme = {
    headFontFace: spec.fontFace || "Aptos Display",
    bodyFontFace: spec.fontFace || "Aptos",
    lang: spec.lang || "zh-CN",
  };
  pptx.defineLayout({ name: "LAYOUT_WIDE", width: SLIDE_W, height: SLIDE_H });

  for (const slideSpec of spec.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: normalizeColor(slideSpec.background, "FFFFFF") };

    if (Array.isArray(slideSpec.elements)) {
      for (const element of slideSpec.elements) {
        renderElement(pptx, slide, element || {});
      }
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await pptx.writeFile({ fileName: outputPath });
  console.log(`[OK] Wrote PPTX: ${outputPath}`);
  console.log(`[OK] Slides: ${spec.slides.length}`);
}

main().catch((error) => {
  console.error(`[FAIL] ${error.stack || error.message}`);
  process.exit(1);
});
