import { describe, expect, it } from 'vitest';
import {
  HIDDEN,
  findHidden,
  formatCodePoint,
  isBinary,
} from '../../../scripts/check-hidden-chars.mjs';

// Every hidden character in these tests is built at runtime from its code
// point. Writing one literally would make this file fail the very check it
// tests, and writing an escape is easy to get wrong through tooling.
const ch = (cp: number): string => String.fromCodePoint(cp);
const LRI = ch(0x2066);
const PDI = ch(0x2069);
const RLO = ch(0x202e);

describe('check-hidden-chars', () => {
  it('passes clean ASCII and clean Arabic prose', () => {
    expect(findHidden('const x = 1;')).toEqual([]);
    // Arabic letters (U+0627 alef, U+0644 lam) are ordinary text, not hidden.
    expect(findHidden(ch(0x0627) + ch(0x0644) + ' parser.py')).toEqual([]);
  });

  it('flags the Trojan Source reversal character with its position', () => {
    expect(findHidden(`ok\nlet a = "${RLO}x";`)).toEqual([
      { line: 2, column: 10, codePoint: 0x202e, name: 'RIGHT-TO-LEFT OVERRIDE' },
    ]);
  });

  it('flags a literal isolate pair, the exact near-miss from the spike', () => {
    const hits = findHidden(`const s = '${LRI}parser.py${PDI}';`);
    expect(hits.map((h) => h.codePoint)).toEqual([0x2066, 0x2069]);
  });

  it('does not flag the escape sequence spelled out in source', () => {
    // A backslash followed by "u2066" is six ASCII characters, not U+2066.
    expect(findHidden(String.fromCharCode(92) + 'u2066')).toEqual([]);
  });

  it('flags a byte-order mark and zero-width characters', () => {
    expect(findHidden(ch(0xfeff) + 'a' + ch(0x200b)).map((h) => h.column)).toEqual([1, 3]);
  });

  it('covers every bidi control in the Trojan Source set, plus the Arabic letter mark', () => {
    for (const cp of [0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e]) {
      expect(HIDDEN.has(cp)).toBe(true);
    }
    for (const cp of [0x2066, 0x2067, 0x2068, 0x2069]) expect(HIDDEN.has(cp)).toBe(true);
  });

  it('counts columns by code point, so astral characters do not shift positions', () => {
    // U+1F600 is two UTF-16 units but one character.
    expect(findHidden(ch(0x1f600) + RLO)[0]?.column).toBe(2);
  });

  it('treats a NUL byte as binary, like git does', () => {
    expect(isBinary(new Uint8Array([0x50, 0x4b, 0x00, 0x03]))).toBe(true);
    expect(isBinary(new TextEncoder().encode('plain text'))).toBe(false);
  });

  it('formats code points as U+XXXX', () => {
    expect(formatCodePoint(0x61c)).toBe('U+061C');
    expect(formatCodePoint(0x202e)).toBe('U+202E');
  });
});
