# ADR-0001: How Baseer delivers speech to a screen reader

- **Status:** **Proposed — awaiting NVDA test results.** The decision matrix
  below is deliberately empty; Nebiyu fills it from a real NVDA session.
- **Date opened:** 2026-08-22
- **Blocks:** every command's output path. Nothing in tasks 4–9 can be
  finalised until this is Accepted.

## Context

Baseer's whole premise is speaking code structure to a screen reader. It turns
out VS Code gives extensions **no way to say "announce this now."**

Verified against `microsoft/vscode@main` `src/vscode-dts/vscode.d.ts`
(21,235 lines) on 2026-08-21:

| Symbol the accessibility wiki recommends | Occurrences in the public API |
|---|---|
| `IAccessibleViewService` | **0** |
| `registerAccessibilityHelpProvider` | **0** |
| `aria.alert` | **0** |
| screen-reader detection (`isScreenReaderOptimized` etc.) | **0** |

There is no `vscode.proposed.accessibility.d.ts` or
`vscode.proposed.accessibleView.d.ts` either — both 404; only
`vscode.proposed.speech.d.ts` exists. Those symbols are internal to VS Code
core (`vs/platform/accessibility/`, `vs/base/browser/ui/aria/`), and the wiki
page recommending them is written for core contributors, not extension
authors.

The entire public surface is `AccessibilityInformation { label, role }`,
attachable to `StatusBarItem`, `LanguageStatusItem`, `TreeItem`, tree
checkboxes, and `NotebookCellStatusBarItem` — all **focus-time labels**, none
an announce-now primitive.

The original spec hedged with "`IAccessibleViewService` (or the current stable
equivalent)". There is no stable equivalent. So the mechanism must be chosen
by experiment, under a real screen reader, and it must be chosen **before**
command output paths are written — retrofitting a different delivery model
across eight commands would be a rewrite.

This cannot be resolved from the development container: no VS Code binary, no
display, no screen reader. Hence a spike the developer runs on Windows.

## Candidates

| | Mechanism | Why it might win | Why it might lose |
|---|---|---|---|
| **A** | `window.showInformationMessage` | Notifications are announced; trivial to implement | Visually intrusive; stacks up on repeat use; likely truncates long text; probably not interruptible |
| **B** | Focused QuickPick, one item per ≤2-sentence chunk | Focus-driven so announcement is reliable; chunking and Escape-to-stop are native, matching the MVP interruptibility requirement | Steals focus from the editor; heavyweight for a one-line answer |
| **C** | Focused read-only document (custom URI scheme) | Best for long output: navigable, re-readable, works with Braille, supports find | Steals focus and adds an editor tab; wrong for a quick summary |
| **D** | Webview with `role="status"` + `aria-live="polite"` | The only true aria-live semantics, and the only candidate that can announce **without** stealing focus | Webview a11y depends on the screen reader treating the iframe as live; historically unreliable; heaviest to build |

The likely outcome is **not** a single winner but a mapping — short status to
one mechanism, long explanations to another. The matrix is built to surface
that rather than force a single choice.

## Evaluation criteria

Each criterion is scored per mechanism × fixture.

1. **Announced at all?** — `yes` / `no` / `partial`. Did NVDA speak anything
   without the tester touching anything else?

   **Definition, fixed 2026-10-12 by Nebiyu Gemedu so it cannot drift:**
   *"Column 1 = spoke its first chunk unprompted, without the user navigating
   into it. Whether the remaining chunks are reachable is columns 2 and 4."*
   So `P` (spoke its first chunk or line, then waited) **passes** column 1.
   The MVP's own rule of at most 2 sentences per chunk means a mechanism that
   speaks chunk one and waits is complying, not failing. Only `N` (nothing
   spoken unprompted) fails the hard criterion. Pass 2 showed this matters:
   C speaks the tab name plus its first line, and B speaks "…, 1 of 4"; both
   are `P`.
2. **Announced correctly?** — `full` / `truncated` / `garbled` / `reordered`.
   Compare Speech Viewer output against the announcement log. Watch for
   punctuation spoken aloud and identifiers mangled.
3. **Cancellation observable by extension?** Renamed from "Interruptible?" and
   split in two by Nebiyu Gemedu on 2026-10-12. **Only 3b scores.**
   - **3a. NVDA Ctrl silenced it?** — `Y` / `N`. Recorded for context, not
     scored. NVDA's Ctrl silences any mechanism, but tells the extension
     nothing.
   - **3b. Extension received a dismissal event?** — `Y` / `N`. There is no
     partial; a `P` here counts as a fail. After the mechanism's own dismiss
     gesture, does the announcement log show a `DISMISSED … extension
     notified` line for that press? The gesture is **Escape** for A, B and D,
     and **Ctrl+W** for C, because a document is dismissed by closing it.

   *Why.* `baseer.stopSpeaking` must abort the LLM request at its source, not
   merely silence audio (MVP spec; THREAT_MODEL T6.3). Speech that the
   extension cannot see being dismissed leaves the request running and the
   budget burning.

   *Note for scoring.* Baseer's own `baseer.stopSpeaking` keybinding is a
   command, so the extension observes it under **every** mechanism. 3b
   measures whether the mechanism's *own* dismissal is observable. Weigh that
   when writing the decision.
4. **Chunked?** — `yes` / `no`. Can the user take it at their own pace, or is
   it one continuous utterance?
5. **Arabic RTL correct?** — `yes` / `no` / `partial`. Is prose right-to-left
   with Latin identifiers still left-to-right and correctly ordered? Requires
   an Arabic NVDA voice installed — note if unavailable.
6. **Focus stealing acceptable?** — `yes` / `no` / `n/a`. Where did focus go,
   and did you get it back without effort?

**Hard disqualifiers.** A mechanism is out for a content class, no matter how
well it scores elsewhere, if it:

- fails criterion 1 on any fixture of that class;
- fails criterion **3b** on `long` (3a never disqualifies);
- fails criterion 5 on `arabic`. Added 2026-10-12 by Nebiyu Gemedu. Without
  this, a mechanism that speaks Arabic in the wrong order, or mangles the
  isolated identifiers, would pass the Arabic class merely by speaking at all.
  For a tool whose headline claim is Arabic support, that is not a pass.

**Invalid presses are re-run, not scored.** If the announcement log marks a
press `INVALID` (mechanism D's webview never signalled ready), that is a spike
fault, not a mechanism result. Close the panel and press again.

### Acceptance rule

Amended 2026-10-12 by Nebiyu Gemedu. Supersedes the stricter wording in the
task-3 closeout instructions of 2026-10-11 ("if no mechanism meets every hard
criterion, REJECTED"), which would have rejected a clean per-class mapping.

> **ACCEPTED** when every content class (short / medium / long / Arabic) has at
> least one mechanism passing all hard criteria. The ADR then records the
> mapping as the decision. **REJECTED** only when some content class has no
> passing mechanism; propose a round-two spike (hybrid or user-settable).

## Test protocol

Install `spikes/speech-delivery/baseer-speech-delivery-spike.vsix` and reload.

1. Open NVDA. Open the Speech Viewer (NVDA menu → Tools → Speech Viewer).
   Leave it open for the entire session.
2. Run `Baseer Spike: Show announcement log` and keep it available — it gives
   a timestamped record to line up against the Speech Viewer transcript.
3. Open a Python file and put the cursor in it, so focus starts somewhere
   realistic and focus-stealing is observable.
4. For each mechanism `Ctrl+Alt+Shift+1..4`, press the key **four times**,
   pausing between presses. The presses walk that mechanism through short,
   medium, long, and Arabic. Cycles are per-mechanism.
5. After each press, record the six criteria.
6. For criterion 3, interrupt mid-utterance with the mechanism's dismiss
   gesture, then check the announcement log for a `DISMISSED` line (3b).
   Only then press NVDA's Ctrl if it is still speaking (3a). Do any clean-up
   *after* reading the log, because clean-up itself can produce a `DISMISSED`
   line that does not count.
7. `Ctrl+Alt+Shift+0` resets all cycles if you lose your place.
8. Save the Speech Viewer log and attach it to the tracking issue.

Take mechanisms one at a time, all four fixtures, before moving on — the
QuickPick and editor candidates leave UI state that muddies the next
mechanism if interleaved.

## Decision matrix — TO BE FILLED FROM NVDA RESULTS

Legend: `Y` yes · `N` no · `P` partial · `—` not applicable. Column 3b is `Y`/`N` only.

### A · Notification

| Fixture | 1 Announced | 2 Correct | 3a Ctrl silenced | 3b Ext. notified | 4 Chunked | 5 Arabic RTL | 6 Focus OK | Notes |
|---|---|---|---|---|---|---|---|---|
| short (10w) | | | | | | — | | |
| medium (40w) | | | | | | — | | |
| long (120w) | | | | | | — | | |
| arabic (RTL) | | | | | | | | |

### B · QuickPick

| Fixture | 1 Announced | 2 Correct | 3a Ctrl silenced | 3b Ext. notified | 4 Chunked | 5 Arabic RTL | 6 Focus OK | Notes |
|---|---|---|---|---|---|---|---|---|
| short (10w) | | | | | | — | | |
| medium (40w) | | | | | | — | | |
| long (120w) | | | | | | — | | |
| arabic (RTL) | | | | | | | | |

### C · Read-only editor

| Fixture | 1 Announced | 2 Correct | 3a Ctrl silenced | 3b Ext. notified | 4 Chunked | 5 Arabic RTL | 6 Focus OK | Notes |
|---|---|---|---|---|---|---|---|---|
| short (10w) | | | | | | — | | |
| medium (40w) | | | | | | — | | |
| long (120w) | | | | | | — | | |
| arabic (RTL) | | | | | | | | |

### D · Webview ARIA live region

| Fixture | 1 Announced | 2 Correct | 3a Ctrl silenced | 3b Ext. notified | 4 Chunked | 5 Arabic RTL | 6 Focus OK | Notes |
|---|---|---|---|---|---|---|---|---|
| short (10w) | | | | | | — | | |
| medium (40w) | | | | | | — | | |
| long (120w) | | | | | | — | | |
| arabic (RTL) | | | | | | | | |

### Environment (fill in)

| | |
|---|---|
| VS Code version | |
| NVDA version | |
| Windows version | |
| English synthesiser / voice | |
| Arabic voice installed? | |
| Date tested | |

## Decision

*To be written once the matrix is filled. Expected shape: a mapping from
content class (short status / medium result / long explanation / interactive
chat) to mechanism, plus a named fallback if the first choice degrades.*

## Consequences

*To be written with the decision. Must cover: what `src/a11y/announce.ts`
exposes, how `baseer.stopSpeaking` cancels under the chosen mechanism, and
how the accessibility help provider is built given that
`IAccessibleViewService` is unavailable.*
