/**
 * Test fixtures for the ADR-0001 speech-delivery spike.
 *
 * Word counts are part of the spec, not decoration: they control how much
 * uninterrupted speech each mechanism has to carry. They are asserted by
 * ../../../src/test/unit/spikeFixtures.test.ts so they cannot silently drift.
 *
 * Content follows .claude/skills/a11y-screenreader/SKILL.md — front-loaded,
 * short declarative sentences, no markdown, no punctuation noise, identifiers
 * spoken naturally ("parser dot p y", not "parser.py").
 */

export type FixtureId = 'short' | 'medium' | 'long' | 'arabicMedium';

export interface Fixture {
  readonly id: FixtureId;
  /** Human label for the tester's notes and the log. Never spoken as content. */
  readonly label: string;
  readonly text: string;
  /** 'rtl' only for Arabic prose. Code and identifiers always stay LTR. */
  readonly dir: 'ltr' | 'rtl';
  /** Expected word count, asserted by the unit test. */
  readonly words: number;
  /** Expected sentence count, asserted by the unit test. */
  readonly sentences: number;
}

/**
 * U+2066 LEFT-TO-RIGHT ISOLATE — opens an LTR run inside RTL prose.
 * Written as an escape, never as a literal character: bidi controls in source
 * are a Trojan Source vector, and eslint-plugin-security rightly rejects them.
 */
const LRI = '\u2066';
/** U+2069 POP DIRECTIONAL ISOLATE — closes it. */
const PDI = '\u2069';

/** Wrap an LTR identifier so it renders and reads correctly inside Arabic prose. */
export const ltr = (identifier: string): string => `${LRI}${identifier}${PDI}`;

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'short',
    label: 'A · short (10 words, 2 sentences)',
    text: 'Module parser dot p y. Three classes and seven functions.',
    dir: 'ltr',
    words: 10,
    sentences: 2,
  },
  {
    id: 'medium',
    label: 'B · medium (40 words, 3 sentences)',
    text:
      'The module parser dot p y contains three classes and seven functions. ' +
      'The largest class is Token Stream, which defines four methods and two properties. ' +
      'Top level imports are numpy, pandas, and the standard library modules itertools, functools, and collections.',
    dir: 'ltr',
    words: 40,
    sentences: 3,
  },
  {
    id: 'long',
    label: 'C · long (120 words, 8 sentences)',
    text:
      'The module parser dot p y contains three classes and seven functions. ' +
      'The largest class is Token Stream, which defines four methods and two properties. ' +
      'Its constructor takes a source string, an optional encoding argument, and a flag that controls whether comments are preserved. ' +
      'The method next token advances the cursor and returns the token at that position. ' +
      'It raises a stop iteration error when the source is exhausted, and logs a warning first. ' +
      'The second class is Parse Error, a subclass of the built in exception type. ' +
      'Seven module level functions follow the classes, of which four are private helpers used only inside this file. ' +
      'Top level imports are numpy, pandas, and the standard library modules itertools and functools.',
    dir: 'ltr',
    words: 120,
    sentences: 8,
  },
  {
    id: 'arabicMedium',
    label: 'D · Arabic medium (translation of B, RTL prose, LTR identifiers isolated)',
    text:
      `الوحدة ${ltr('parser.py')} تحتوي على ثلاثة أصناف وسبع دوال. ` +
      `أكبر صنف هو ${ltr('TokenStream')}، ويعرّف أربع دوال وخاصيتين. ` +
      `الاستيرادات في المستوى الأعلى هي ${ltr('numpy')} و${ltr('pandas')} ` +
      `ووحدات المكتبة القياسية ${ltr('itertools')} و${ltr('functools')} و${ltr('collections')}.`,
    dir: 'rtl',
    // Arabic word/sentence counts are not held to the English targets; the
    // requirement is only that this is an Arabic version of the medium string.
    words: 0,
    sentences: 3,
  },
];

/** Split into speakable chunks of at most `maxSentences` sentences. */
export function chunk(text: string, maxSentences = 2): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    out.push(
      sentences
        .slice(i, i + maxSentences)
        .join('')
        .trim(),
    );
  }
  return out;
}
