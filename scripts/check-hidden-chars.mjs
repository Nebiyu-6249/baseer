// Fails if any git-tracked text file contains a literal bidi-control or
// zero-width character. Runs as a blocking CI job over the WHOLE repository,
// not just src/: ESLint's security/detect-bidi-characters only sees JS/TS under
// src/, which is how a literal U+2066 once reached spikes/ unnoticed.
//
// Usage: node scripts/check-hidden-chars.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Characters that render invisibly or reorder text. Listed as numbers, never as
 * literals or escapes, so this file can never trip its own check.
 *
 * The bidi controls are the Trojan Source set (CVE-2021-42574) plus U+061C
 * ARABIC LETTER MARK, which matters in a codebase that ships Arabic strings.
 * Arabic prose needs none of these as literals: Baseer adds isolates at render
 * time through an ltr() helper written with escape sequences.
 */
export const HIDDEN = new Map([
  [0x061c, 'ARABIC LETTER MARK'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200c, 'ZERO WIDTH NON-JOINER'],
  [0x200d, 'ZERO WIDTH JOINER'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0x200f, 'RIGHT-TO-LEFT MARK'],
  [0x202a, 'LEFT-TO-RIGHT EMBEDDING'],
  [0x202b, 'RIGHT-TO-LEFT EMBEDDING'],
  [0x202c, 'POP DIRECTIONAL FORMATTING'],
  [0x202d, 'LEFT-TO-RIGHT OVERRIDE'],
  [0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
  [0x2060, 'WORD JOINER'],
  [0x2066, 'LEFT-TO-RIGHT ISOLATE'],
  [0x2067, 'RIGHT-TO-LEFT ISOLATE'],
  [0x2068, 'FIRST STRONG ISOLATE'],
  [0x2069, 'POP DIRECTIONAL ISOLATE'],
  [0xfeff, 'ZERO WIDTH NO-BREAK SPACE (BOM)'],
]);

const NEWLINE = 10;

/** Every hidden character in `text`, with 1-based line and column. */
export function findHidden(text) {
  const found = [];
  let line = 1;
  let column = 1;
  for (const ch of text) {
    const codePoint = ch.codePointAt(0) ?? 0;
    const name = HIDDEN.get(codePoint);
    if (name) found.push({ line, column, codePoint, name });
    if (codePoint === NEWLINE) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return found;
}

/** Git's own heuristic: a NUL byte in the first 8000 bytes means binary. */
export function isBinary(bytes) {
  return bytes.subarray(0, 8000).includes(0);
}

export const formatCodePoint = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split(String.fromCharCode(0))
    .filter(Boolean);
}

function main() {
  let scanned = 0;
  let binary = 0;
  let total = 0;
  for (const file of trackedFiles()) {
    const bytes = readFileSync(file);
    if (isBinary(bytes)) {
      binary += 1;
      continue;
    }
    scanned += 1;
    for (const hit of findHidden(bytes.toString('utf8'))) {
      total += 1;
      console.error(
        `${file}:${hit.line}:${hit.column}  ${formatCodePoint(hit.codePoint)} ${hit.name}`,
      );
    }
  }
  if (total > 0) {
    console.error('');
    console.error(
      `${total} hidden or bidi-control character(s) found. Write them as escape ` +
        "sequences in source (e.g. '\\u2066'), never as literal characters — see " +
        '.claude/skills/a11y-screenreader/SKILL.md (Trojan Source).',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `OK: ${scanned} tracked text files scanned (${binary} binary skipped); ` +
      'no hidden or bidi-control characters.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
