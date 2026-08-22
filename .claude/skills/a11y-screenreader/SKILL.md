---
name: a11y-screenreader
description: Screen-reader UX rules for Baseer (NVDA, JAWS, VoiceOver) and Arabic RTL handling. Use when writing any user-facing string, announcement, verbosity logic, keybinding, or i18n content.
---

# Screen-reader UX rules for Baseer

Primary target is **NVDA on Windows**. JAWS second, VoiceOver third.
Every rule below is a merge blocker, not a preference.

## Writing speakable strings

Speech is linear, unskimmable, and interrupts. Optimise for the ear.

- **Front-load the answer.** "Three classes, seven functions" before
  "in module foo dot py". A user who has heard enough presses Escape;
  they should already have the payload.
- **Short declarative sentences.** One clause. No subordinate stacking.
- **No markdown in spoken text.** Screen readers speak `**`, `#`, `|`, and
  backticks literally or drop them unpredictably. No tables, no ASCII art,
  no box drawing, no emoji.
- **Expand identifiers deliberately.** `parseInput` should be spoken as
  "parse input" in prose but the exact identifier must remain recoverable.
  Say the natural form, then the literal form when precision matters:
  "the function parse input, spelled p-a-r-s-e capital I-n-p-u-t" only at
  verbose level — never at terse.
- **Pronounce punctuation-heavy names explicitly.** `__init__` is
  "dunder init", `_x` is "underscore x", `foo.py` is "foo dot p y".
- **Numbers before nouns.** "Seven functions", not "functions: 7".
- **Never rely on ordering alone** to convey grouping; say the grouping.

## Verbosity levels

| Level | Contract |
|---|---|
| terse | One sentence. Counts and names only. No purpose text, no positions. |
| normal | Two to four sentences. Counts, names, signatures. Line numbers on request. |
| verbose | Adds line numbers, parameter types, decorators, LLM-generated purpose. |

Terse is the default for repeat operations; a user hitting the same command
in a loop must not be re-read a preamble. State the level change when it
changes, never on every subsequent call.

## Interruption

Anything longer than one sentence must be interruptible and resumable.
`baseer.stopSpeaking` must cancel in-flight work at the source — abort the
LLM request, do not merely stop displaying. A cancelled request that still
burns budget is a bug.

## Never do these

- Never convey state by colour, icon, or badge position alone. Every visual
  signal needs a text equivalent in the accessible name.
- Never auto-announce on a timer or on document change without the user
  opting in. Unrequested speech is the top complaint in the literature.
- Never move focus without the user initiating it.
- Never bypass the OS screen reader with our own audio unless the user has
  explicitly enabled in-extension TTS in settings.
- Never emit a bare notification with no text (screen readers announce
  "notification" and nothing else).

## Arabic / RTL

- **Code stays LTR.** Keywords, identifiers, and file paths are English and
  must never be bidi-reordered. Explanations render RTL.
- Mixing an LTR identifier into an RTL sentence needs explicit Unicode
  isolation: wrap the identifier in U+2066 LEFT-TO-RIGHT ISOLATE … U+2069
  POP DIRECTIONAL ISOLATE. Without it the rendered order is wrong and the
  spoken order can be too.
- **Write bidi controls as escapes (`'\u2066'`), never as literal characters
  in source.** Literal bidi controls are a Trojan Source vector — they can
  make source read differently to a human than it does to the compiler — and
  `eslint-plugin-security`'s `detect-bidi-characters` rule correctly rejects
  them. The escape produces an identical runtime string with none of the
  risk, so this costs nothing. Do not suppress the rule; it is right.
  Centralise the pair in one `ltr()` helper rather than scattering escapes.
- Keep the two directions separate: **strip** bidi controls from anything
  sent to the LLM (they are an injection-evasion vector), and **add** them
  only when rendering output. One shared filter for both would break one of
  the two.
- Do not machine-translate identifiers, keywords, or error codes. Translate
  the prose around them.
- Arabic screen-reader support quality varies sharply by synthesiser. NVDA
  needs an Arabic voice installed; verify with a real one before claiming
  Arabic support works.
- Test RTL with the actual toggle, not by changing VS Code's display
  language — those are different code paths in Baseer.

## Keyboard

Zero mouse dependence, all commands in the Command Palette. Avoid binding
anything that collides with NVDA's `Insert`-based layer or JAWS's
`Insert`/`Caps Lock` layer. Prefer `Ctrl+Alt+…` chords, and verify no
conflict with VS Code defaults on each platform.

## Manual NVDA checklist (must pass before every release)

1. Speech Viewer open; run each command; confirm text matches intent.
2. Confirm no command speaks markdown syntax or punctuation noise.
3. Confirm `stopSpeaking` silences mid-utterance and cancels the request.
4. Confirm every status change has a spoken equivalent.
5. Confirm Arabic toggle produces RTL prose with LTR-isolated identifiers.
6. Confirm keyboard-only operation end to end, including the chat panel.
7. Capture the Speech Viewer log into the PR.
