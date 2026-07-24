#!/usr/bin/env node
/**
 * Repo-wide HOMOGLYPH guard (CI). Fails if any .ts/.tsx file under src/ contains a CONFUSABLE
 * letter -- a non-Latin character that looks like a Latin one (Cyrillic, Greek, Armenian, Cherokee,
 * fullwidth Latin, ...) -- in CODE (outside comments and string/template literals).
 *
 * This is the precise form of the Phase 2b defence (src/lib/gst/no-homoglyph.test.ts): that phase
 * caught a Cyrillic "Р" smuggled into the identifiers cgstР/sgstР/igstР, which compiled but meant
 * something else. We deliberately do NOT flag legitimate typography (arrows, dashes, middots,
 * bullets, the rupee sign, emoji, etc.) -- those are display characters, not identifier lookalikes,
 * and appear throughout the marketing/component copy. Only confusable LETTERS are a homoglyph risk.
 *
 * Stripping logic is identical to no-homoglyph.test.ts (block comments removed newline-preserving;
 * per line, string/template literals + line comments stripped). A confusable inside a string or a
 * comment (e.g. legitimate Cyrillic in human copy) is therefore NOT flagged -- only code is.
 *
 * NOTE (known limitation, shared with Phase 2b): the per-line stripper does not track MULTI-LINE
 * template literals, so a confusable letter on a continuation line of a `...` template would be
 * reported. No such case exists today; if one appears, quote-normalise or refactor rather than
 * disabling the guard.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2] ?? "src";

/**
 * Confusable letter ranges (homoglyph-prone scripts usable in JS/TS identifiers). Symbols, dashes,
 * arrows, currency, punctuation and emoji are intentionally EXCLUDED -- they are not letters and
 * cannot masquerade as a Latin identifier character.
 */
const CONFUSABLE_RANGES = [
  [0x0370, 0x03ff], // Greek and Coptic
  [0x0400, 0x04ff], // Cyrillic
  [0x0500, 0x052f], // Cyrillic Supplement
  [0x0530, 0x058f], // Armenian
  [0x13a0, 0x13ff], // Cherokee
  [0x1c80, 0x1c8f], // Cyrillic Extended-C
  [0x1f00, 0x1fff], // Greek Extended
  [0x2c00, 0x2c5f], // Glagolitic
  [0x2de0, 0x2dff], // Cyrillic Extended-A
  [0xa640, 0xa69f], // Cyrillic Extended-B
  [0xab70, 0xabbf], // Cherokee Supplement
  [0xff21, 0xff3a], // Fullwidth Latin A-Z
  [0xff41, 0xff5a], // Fullwidth Latin a-z
];

function isConfusable(cp) {
  for (const [lo, hi] of CONFUSABLE_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

/** Replace block comments with space padding, preserving newlines so line numbers are stable. */
function stripBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** Strip quoted/backtick literals and a trailing line comment from ONE line (char-by-char). */
function stripStringsAndLineComment(line) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < line.length) {
        if (line[i] === "\\") {
          i += 2;
          continue;
        }
        if (line[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === "/" && line[i + 1] === "/") break; // rest of line is a comment
    out += ch;
    i += 1;
  }
  return out;
}

function collect(dir, acc) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collect(full, acc);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

function scanFile(path) {
  const lines = stripBlockComments(readFileSync(path, "utf8")).split("\n");
  const offenders = [];
  for (let i = 0; i < lines.length; i += 1) {
    const code = stripStringsAndLineComment(lines[i]);
    for (let col = 0; col < code.length; col += 1) {
      const cp = code.codePointAt(col);
      if (isConfusable(cp)) {
        offenders.push({ line: i + 1, column: col + 1, cp });
      }
    }
  }
  return offenders;
}

const files = collect(ROOT, []);
let total = 0;
for (const file of files) {
  for (const o of scanFile(file)) {
    total += 1;
    const hex = o.cp.toString(16).toUpperCase().padStart(4, "0");
    console.error(
      `${file.replace(/\\/g, "/")}:${o.line}:${o.column} confusable letter U+${hex} in code`,
    );
  }
}

if (total > 0) {
  console.error(
    `\nhomoglyph guard FAILED: ${total} confusable letter(s) in code across ${files.length} scanned files.`,
  );
  process.exit(1);
}
console.log(`homoglyph guard passed: ${files.length} .ts/.tsx files scanned, no confusable letters in code.`);
