import { describe, expect, it } from 'vitest';
import { FIXTURES, chunk, ltr, splitSentences } from '../../../spikes/speech-delivery/src/fixtures';

const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const countSentences = (s: string): number => (s.match(/[.!?]+(?=\s|$)/g) ?? []).length;
const count = (s: string, ch: string): number => s.split(ch).length - 1;
/** Every LTR isolate opened in `s` is also closed in `s`. */
const isolatesBalanced = (s: string): boolean => count(s, '\u2066') === count(s, '\u2069');
const arabicText = (): string => FIXTURES.find((f) => f.id === 'arabicMedium')?.text ?? '';

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

  // Regression: the original splitter broke on the "." inside parser.py, so
  // mechanism C rendered "<LRI>parser." and "py<PDI> ..." on separate lines and
  // mechanism B's chunk boundaries landed mid-identifier. Either would have
  // produced a false Arabic RTL failure attributable to the spike, not the
  // mechanism under test.
  describe('splitSentences()', () => {
    it('splits the Arabic fixture into exactly its 3 sentences', () => {
      expect(splitSentences(arabicText())).toHaveLength(3);
    });

    it('never splits inside an LTR isolate', () => {
      for (const f of FIXTURES) {
        for (const s of splitSentences(f.text)) expect(isolatesBalanced(s)).toBe(true);
      }
    });

    it('keeps an isolated identifier containing "." in one piece', () => {
      const [first] = splitSentences(arabicText());
      expect(first).toContain(ltr('parser.py'));
    });

    it('does not end a sentence at a "." followed by a non-space, even un-isolated', () => {
      expect(splitSentences('Module parser.py loaded. Next one.')).toEqual([
        'Module parser.py loaded.',
        'Next one.',
      ]);
    });

    it('loses no text for any fixture', () => {
      for (const f of FIXTURES) {
        expect(splitSentences(f.text).join(' ')).toBe(f.text.replace(/\s+/g, ' ').trim());
      }
    });

    it('agrees with the independent sentence counter for every fixture', () => {
      for (const f of FIXTURES) expect(splitSentences(f.text)).toHaveLength(f.sentences);
    });
  });

  describe('chunk()', () => {
    it('splits the Arabic fixture 2 + 1, with isolates balanced in every chunk', () => {
      const chunks = chunk(arabicText(), 2);
      expect(chunks.map(countSentences)).toEqual([2, 1]);
      for (const c of chunks) expect(isolatesBalanced(c)).toBe(true);
    });

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
