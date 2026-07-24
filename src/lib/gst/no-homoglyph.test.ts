import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Guards against homoglyph attacks: a non-ASCII look-alike character (e.g. a Cyrillic letter that
// resembles a Latin one) smuggled into an IDENTIFIER or operator would compile yet silently create
// a different symbol. We therefore forbid any non-ASCII character in CODE. Non-ASCII IS allowed
// inside comments and string/template literals (we use the rupee sign, arrows, ellipses there), so
// the scanner strips those regions before checking. This file is itself scanned, so it stays pure
// ASCII throughout.

const HERE = dirname(fileURLToPath(import.meta.url));

/** Replace block comments with space padding, preserving newlines so line numbers are stable. */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * Strip single-quoted, double-quoted and backtick literals, plus a trailing line comment, from ONE
 * line. Character-by-character so escaped quotes and a "//" that follows a string are handled.
 */
function stripStringsAndLineComment(line: string): string {
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
    if (ch === "/" && line[i + 1] === "/") {
      break; // remainder of the line is a comment
    }
    out += ch;
    i += 1;
  }
  return out;
}

function gstSourceFiles(): string[] {
  return readdirSync(HERE)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(HERE, name));
}

interface Offender {
  file: string;
  line: number;
  column: number;
  codePoint: number;
}

function scanFile(path: string): Offender[] {
  const raw = readFileSync(path, "utf8");
  const withoutBlocks = stripBlockComments(raw);
  const lines = withoutBlocks.split("\n");
  const offenders: Offender[] = [];
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const code = stripStringsAndLineComment(lines[lineIdx]);
    for (let col = 0; col < code.length; col += 1) {
      const cp = code.charCodeAt(col);
      if (cp > 0x7f) {
        offenders.push({ file: path, line: lineIdx + 1, column: col + 1, codePoint: cp });
      }
    }
  }
  return offenders;
}

describe("no homoglyphs in GST source code", () => {
  it("finds at least one .ts file to scan", () => {
    expect(gstSourceFiles().length).toBeGreaterThan(0);
  });

  it("contains no non-ASCII character in code (outside comments and string literals)", () => {
    const all: Offender[] = [];
    for (const file of gstSourceFiles()) {
      all.push(...scanFile(file));
    }
    const report = all
      .map((o) => `${o.file}:${o.line}:${o.column} U+${o.codePoint.toString(16).toUpperCase().padStart(4, "0")}`)
      .join("\n");
    expect(all, `non-ASCII code characters found:\n${report}`).toEqual([]);
  });
});
