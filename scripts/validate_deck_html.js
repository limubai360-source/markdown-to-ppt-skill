#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[OK] ${message}`);
}

function extractPptxSpec(html) {
  const match = html.match(
    /<script\b[^>]*\bid=["']pptx-spec["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return null;
  return match[1].trim();
}

function countSlides(html) {
  const matches = html.match(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>/gi);
  return matches ? matches.length : 0;
}

function hasExternalAsset(html) {
  return /<img\b[^>]*\bsrc=["']https?:\/\//i.test(html) ||
    /url\(\s*["']?https?:\/\//i.test(html) ||
    /<link\b[^>]*\bhref=["']https?:\/\//i.test(html) ||
    /<script\b(?![^>]*\bid=["']pptx-spec["'])[^>]*\bsrc=["']https?:\/\//i.test(html);
}

function hasSixteenNineHint(html) {
  return /aspect-ratio\s*:\s*16\s*\/\s*9/i.test(html) ||
    (/width\s*:\s*1280px/i.test(html) && /height\s*:\s*720px/i.test(html)) ||
    (/width\s*:\s*13\.333in/i.test(html) && /height\s*:\s*7\.5in/i.test(html));
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node validate_deck_html.js <slides.html>");
    process.exit(2);
  }

  const htmlPath = path.resolve(input);
  if (!fs.existsSync(htmlPath)) {
    console.error(`[FAIL] File not found: ${htmlPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const slideCount = countSlides(html);
  const specRaw = extractPptxSpec(html);

  if (/<!doctype html>/i.test(html) || /<html\b/i.test(html)) pass("HTML document wrapper found");
  else fail("Missing complete HTML document wrapper");

  if (/<style\b[\s\S]*?<\/style>/i.test(html)) pass("Inline CSS found");
  else fail("Missing inline <style> block");

  if (hasSixteenNineHint(html)) pass("16:9 slide sizing hint found");
  else fail("Missing clear 16:9 sizing hint, such as aspect-ratio: 16 / 9");

  if (slideCount > 0) pass(`${slideCount} section.slide element(s) found`);
  else fail("No <section class=\"slide\"> elements found");

  if (!hasExternalAsset(html)) pass("No external HTTP(S) image/script/style asset found");
  else fail("External HTTP(S) asset found; use inline CSS and local/CSS-drawn visuals only");

  if (!specRaw) {
    fail("Missing <script type=\"application/json\" id=\"pptx-spec\">");
    return;
  }

  let spec;
  try {
    spec = JSON.parse(specRaw);
    pass("pptx-spec JSON parsed");
  } catch (error) {
    fail(`pptx-spec is not valid JSON: ${error.message}`);
    return;
  }

  if (spec.size === "LAYOUT_WIDE") pass("pptx-spec size is LAYOUT_WIDE");
  else fail("pptx-spec.size should be LAYOUT_WIDE");

  if (Array.isArray(spec.slides)) pass("pptx-spec.slides is an array");
  else {
    fail("pptx-spec.slides must be an array");
    return;
  }

  if (spec.slides.length === slideCount) {
    pass("pptx-spec slide count matches section.slide count");
  } else {
    fail(`pptx-spec has ${spec.slides.length} slide(s), HTML has ${slideCount}`);
  }

  spec.slides.forEach((slide, index) => {
    if (!Array.isArray(slide.elements)) {
      fail(`Slide ${index + 1} is missing an elements array`);
    }
  });
}

main();
