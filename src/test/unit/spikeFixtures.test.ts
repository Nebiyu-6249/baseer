import { describe, expect, it } from 'vitest';
import { FIXTURES, chunk, ltr } from '../../../spikes/speech-delivery/src/fixtures';

const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const countSentences = (s: string): number => (s.match(/[.!?]+(?=\s|$)/g) ?? []).length;

describe('ADR-0001 spike fixtures', () => {
  it('has one fixture per required size, plus Arabic', () => {
    expect(FIXTURES.map((f) => f.id)).toEqual(['short', 'medium', 'long', 'arabicMedium']);
  });

  // The word counts ARE the spec: they control how much uninterrupted speech
  // each mechanism has to carry. Drift would silently invalidate the comparison.
  it.each(FIXTURES.filter((f) => f.words > 0).map((f) => [f.id, f.text, f.words] as const))(
    '%s has exactly %i words as declared',
    (_id, text, words) => {
      expect(countWords(text)).toBe(words);
    },
  );

  it.each(FIXTURES.map((f) => [f.id, f.text, f.sentences] as const))(
    '%s has exactly the declared sentence count',
    (_id, text, sentences) => {
      expect(countSentences(text)).toBe(sentences);
    },
  );

  it('matches the sizes named in the task: 10 / 40 / 120 words', () => {
    const by = Object.fromEntries(FIXTURES.map((f) => [f.id, f]));
    expect(by.short?.words).toBe(10);
    expect(by.medium?.words).toBe(40);
    expect(by.long?.words).toBe(120);
  });

  describe('Arabic fixture', () => {
    const arabic = FIXTURES.find((f) => f.id === 'arabicMedium');

    it('is marked rtl', () => {
      expect(arabic?.dir).toBe('rtl');
    });

    it('contains Arabic script', () => {
      expect(arabic?.text).toMatch(/[؀-ۿ]/);
    });

    it('isolates every Latin identifier with U+2066 and U+2069', () => {
      const text = arabic?.text ?? '';
      const opens = (text.match(/\u2066/g) ?? []).length;
      const closes = (text.match(/\u2069/g) ?? []).length;
      expect(opens).toBeGreaterThan(0);
      expect(opens).toBe(closes);
      // Escapes, not literals: bidi characters in source are a Trojan Source
      // vector (security/detect-bidi-characters).
      // No bare Latin run may sit outside an isolate: every Latin sequence must
      // be preceded by U+2066 and followed by U+2069.
      for (const m of text.matchAll(/[A-Za-z][A-Za-z.]*/g)) {
        const before = text[m.index - 1];
        const after = text[m.index + m[0].length];
        expect(before).toBe('\u2066');
        expect(after).toBe('\u2069');
      }
    });
  });

  describe('chunk()', () => {
    it('never exceeds the requested sentences per chunk', () => {
      for (const f of FIXTURES) {
        for (const c of chunk(f.text, 2)) expect(countSentences(c)).toBeLessThanOrEqual(2);
      }
    });

    it('loses no text', () => {
      const long = FIXTURES.find((f) => f.id === 'long');
      const rejoined = chunk(long?.text ?? '', 2)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      expect(rejoined).toBe((long?.text ?? '').replace(/\s+/g, ' ').trim());
    });

    it('splits the 8-sentence fixture into 4 chunks', () => {
      expect(chunk(FIXTURES.find((f) => f.id === 'long')?.text ?? '', 2)).toHaveLength(4);
    });
  });

  it('ltr() wraps with the isolate pair', () => {
    expect(ltr('parser.py')).toBe('\u2066parser.py\u2069');
  });
});
