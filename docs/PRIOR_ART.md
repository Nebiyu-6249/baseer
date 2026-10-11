# Prior art synthesis

Compiled 2026-08-21 during bootstrap. Academic entries (§5–7) re-verified
against full texts 2026-10-12.

> **Sourcing — read this first.** The three academic entries (§5–7) were
> re-read **in full** on 2026-10-12. The exact arXiv versions and their SHA256
> are in `docs/papers/CHECKSUMS.txt`, and every page number below refers to
> those files. Where the full text changed what we had written from the
> abstracts, the entry says **Correction** in place. Nothing in §5–7 is
> abstract-only any more.
>
> §4 (VS Code accessibility guidance) still rests on the GitHub wiki and a
> direct read of `vscode.d.ts`. `code.visualstudio.com` is reachable now but
> was not re-read in this pass.
>
> Code repositories (§1–3) were read directly (READMEs and `package.json`) via
> `raw.githubusercontent.com` at bootstrap, so those findings are firsthand.

---

## 1. `microsoft/vscode-extension-samples`

**Read:** repository README, sample index.

**Borrow.** Three samples map onto Baseer directly:
- `helloworld-sample` — the command registration + `package.json`
  contribution shape. This is the skeleton for all eight Baseer commands.
- `helloworld-test-sample` — the `@vscode/test-electron` integration test
  harness. Copy this structure early; retrofitting integration tests is
  painful.
- `webview-sample` — panel lifecycle, message passing, and CSP setup for
  `baseer.askAboutCode`.
- `tree-view-sample` — relevant only if we later add a navigable code-outline
  tree. **Not MVP.** Noted so it is not mistaken for scope.

**Avoid.** The samples are deliberately minimal and have no accessibility
story at all — no `AccessibilityInformation`, no ARIA in the webview, no
keyboard-only path. Treat them as structural templates only. In particular,
the `webview-sample` CSP is a starting point, not a finished policy.

**Design decision supported.** *Use the official sample structure for
scaffolding rather than inventing a layout* — it keeps us aligned with what
`yo code` generates and what VS Code's own docs assume, which matters when
debugging.

---

## 2. `cursorless-dev/vscode-parse-tree` (v0.58.0)

**Read:** README, `package.json`.

**Borrow.**
- **Exact version pinning.** They pin `"web-tree-sitter": "0.26.10"` with no
  caret. The wasm ABI between runtime and prebuilt grammars is
  version-coupled; a floating range can desynchronise them. Baseer pins both
  the runtime and the grammar package exactly and bumps them as a pair.
- **`onLanguage:<id>` activation.** Narrow activation keyed to the languages
  we actually parse, rather than `*`.
- **An explicit languageId -> grammar map** in a single `languages.ts`
  module, rather than deriving parser names from language ids.

**Avoid.** Their architecture exposes the parse tree as a *public extension
API* consumed by other extensions via `extensions.getExtension(...)` +
`extensionDependencies`. That is right for a shared infrastructure
extension and wrong for Baseer: it would add a hard cross-extension
dependency and a second trust boundary (another extension in the same window
is an adversary in our threat model) for no user-facing benefit. Baseer owns
its parser in-process.

Also note they maintain **their own fork**, `@cursorless/tree-sitter-wasms`,
rather than depending on the community `tree-sitter-wasms`. Read that as a
signal about the upstream package's suitability, and evaluate
`@vscode/tree-sitter-wasm` before defaulting to either.

**Design decision supported.** *Bundle grammars as pinned, checksummed wasm
artifacts; keep the parser in-process rather than depending on a third-party
parse-tree extension.*

---

## 3. `selfint/vscode-tree-sitter` (v0.0.1)

**Read:** README, `package.json`.

**Borrow.** Essentially one thing, and it is a bug report rather than a
pattern: their documented "Known Issues" records that VS Code `languageId`
values do not match tree-sitter parser names —
`typescriptreact` -> `tree-sitter-typescript.tsx`,
`javascriptreact` -> `tree-sitter-javascript`. That becomes a test case in
our language map the moment we add JS (and TSX in v2).

**Avoid — this is the cautionary entry.** It *dynamically downloads parsers
from npm at runtime* and requires the user to have `node`, `npm`, and a
global `electron-rebuild` installed. That is:
1. a supply-chain hole (fetching and executing code at runtime, post-review),
2. a hostile setup burden, and
3. specifically cruel to our users — a blind developer debugging a failed
   native module rebuild through a screen reader is exactly the failure mode
   Baseer exists to reduce.

It also uses `web-tree-sitter ^0.20.8` (old API) against
`engines.vscode ^1.79.0`, so its code samples do not transfer.

**Design decision supported.** *Ship a fixed set of grammars inside the
`.vsix`. Nothing fetched at runtime, nothing native, works offline.*

---

## 4. Microsoft VS Code Accessibility Guidelines (wiki)

**Read:** `github.com/microsoft/vscode/wiki/Accessibility-Guidelines`, plus a
direct check against `vscode.d.ts` @ `main` (21,235 lines).

**This produced the most consequential finding of the bootstrap.**

The wiki tells authors to register providers via
`IAccessibleViewService.registerProvider()`, announce with `aria.alert()`,
and contribute an `accessibility.verbosity` setting. I grepped the public
API surface for all three:

| Symbol | Occurrences in `vscode.d.ts` |
|---|---|
| `IAccessibleViewService` | **0** |
| `registerAccessibilityHelpProvider` | **0** |
| `aria.alert` | **0** |
| screen-reader detection (`isScreenReaderOptimized` etc.) | **0** |

**That wiki page is written for VS Code core contributors, not extension
authors.** Those are internal services in `vs/platform/accessibility/` and
`vs/base/browser/ui/aria/`, unavailable to the extension host. There is no
`vscode.proposed.accessibility.d.ts` or `vscode.proposed.accessibleView.d.ts`
either (both 404); only `vscode.proposed.speech.d.ts` exists.

The entire public accessibility surface is `AccessibilityInformation
{ label, role }`, attachable to `StatusBarItem`, `LanguageStatusItem`,
`TreeItem`, tree checkboxes, and `NotebookCellStatusBarItem` — all
**focus-time labels**, none an announce-now primitive.

**Borrow.** The *principles* are still right and we should follow them:
front-load essential information in accessible names, comma-separate detail,
prefer native controls over custom ARIA roles, give screen-reader users a
discoverable way to learn the feature's keybindings.

**Avoid.** Writing any code against those three symbols. The bootstrap spec's
own hedge — "`IAccessibleViewService` (or the current stable equivalent)" —
turns out to be load-bearing: **there is no stable equivalent.**

**Design decision supported.** *Build the accessibility help provider as a
Baseer-owned, focusable surface (a dedicated command opening a read-only
document or QuickPick listing every keybinding), not as a registration
against a VS Code service that extensions cannot reach.* This is the first
thing to prove in a running Extension Development Host, because the entire
accessibility contract depends on how we deliver speech. See "Open
questions".

---

## 5. Chen et al. — *Screen Reader Programmers in the Vibe Coding Era* (arXiv 2506.13270)

**Read:** full text, arXiv **v2** (11 Dec 2025, 30 manuscript pages), on
2026-10-12. **Venue not confirmed:** v2 is an ACM-format manuscript whose
conference name and DOI are still template placeholders (p. 1), so cite it as
an arXiv preprint.

**Study (confirmed).** A two-week, three-phase longitudinal study of 16 screen
reader programmers using GitHub Copilot in VS Code (pp. 1, 5–8):

1. An initial session: background interview, tailored tutorial, a programming
   task of about an hour, 7-point Likert ratings, and a semi-structured
   interview.
2. Two weeks of self-directed use with a diary (31 cases).
3. A follow-up of about 30 minutes, completed by 15 of the 16.

13 participants were totally blind and 3 low vision; 14 men, 2 women (p. 6).
Remote, April–May 2025, IRB-approved (p. 5). Participants were mainly in China
(p. 21), which matters when generalising to a UAE cohort.

**Failure modes (confirmed, with a refinement).** The abstract names three:
conveying intent, interpreting AI output, and managing multiple views while
keeping situational awareness (p. 1). The findings section organises them as
**four** areas: communicating with the assistant (§4.2.1), reviewing its
responses (§4.2.2), switching between views (§4.2.3), and system status and
next steps (§4.2.4) (p. 12). Our earlier "(c)" merged the last two.

**Baseer's answer to each, re-checked against the text:**

- (a) *Intent by location.* Partly supported, but the evidence is narrower than
  we said. A participant selected lines as context and heard only the file
  name, so could not tell what the assistant was actually using (p. 12). The
  finding is about **feedback on what context is in use**, not about selection
  scoping as such. Task-5 consequence, not a design change: every LLM command
  should say what it is about to send, not only at `verbose` (compare
  THREAT_MODEL T6.1).
- (b) *Chunked, fixed-format output.* Consistent with the paper, but not tested
  by it. The paper reports long linear responses as hard to navigate
  (pp. 14, 16), a request for a table of contents (p. 14), and markup leaking
  into a plain-text view (p. 15). It does not evaluate two-sentence chunking.
  Keep this as a Baseer design choice; do not cite it as a Chen finding.
- (c) *`summarizeLastDiff`.* **Correction: the rationale changes, the decision
  does not.** Chen's situational-awareness problem (§4.2.4, p. 15) is about
  knowing what the AI is doing and what it is waiting for, which is process
  status. The support for a spoken diff summary is §4.2.2 instead. Participants
  could not follow mixed added, removed, and unchanged lines in the diff view,
  or keep count of which change blocks they had reviewed (p. 13). The paper
  recommends accessible change tracking covering the scope, location, and
  content of edits (p. 21). That fits `summarizeLastDiff` far better than (c).

**Avoid ambient speech (confirmed, with nuance).** Several participants found
automatic playback and repeated status announcements disruptive, and asked to
be told only when their action was needed (p. 16). The paper recommends a
do-not-disturb mode and on-demand status checks (p. 21). Preferences were
mixed, though: some participants valued sound cues (p. 16), and many adapted to
code-completion cues over the two weeks (p. 17). So "user-initiated by
default" is supported. "Unrequested speech is the top complaint in the
literature" (the a11y-screenreader skill's wording) is **not** a claim this
paper makes.

**Newly found and relevant:**

- *Verifiability.* Participants worried explicitly that the assistant can
  fabricate. It inserted hallucinated data in place of real terminal output,
  and a participant suspected it of inventing library functions (p. 14). The
  paper recommends making AI responses verifiable (p. 21). This is direct
  empirical support for the LLM09 framing in THREAT_MODEL §5 and for the
  AST-first design.
- *Automation versus control.* Over the two weeks participants moved away
  from the most automated mode toward the one that asks before touching files
  (pp. 16–17). This supports the MVP's no-file-writes, no-tool-use stance
  (LLM06).
- *Status while waiting.* A participant valued a continuous sound during
  generation, so they could work in parallel (p. 15). For Baseer's
  network-bound LLM commands, one "working" cue plus a completion announcement
  is user-initiated, so it fits "no ambient speech". Task-5 consideration.
- *Plain-text view.* Copilot's accessible view (one plain-text window, focus at
  the top, back to where you were on close) was praised for its simplicity,
  though some participants later preferred the structured message list
  (p. 15). This is prior evidence relevant to ADR-0001 candidate C. It does
  not replace our own NVDA run.
- *Customisation.* The paper recommends optional accessibility features users
  can tune (p. 21). That supports the verbosity levels, and a user-settable
  delivery mechanism if ADR-0001 needs a second round.

**Design decision supported.** *`summarizeLastDiff` is a core MVP command,
not a nice-to-have.* Confirmed, through §4.2.2 and the change-tracking
recommendation (pp. 13, 21) rather than through situational awareness.

**Also supports** the two-week longitudinal shape for the AURAK study
(task 10). The authors chose it because most participants were new to these
tools, so a single session would not show practical use (p. 5), and
preferences shifted measurably between phases (p. 16). Their compensation
(USD 70, or USD 55 without the follow-up, plus USD 10 for a subscription;
p. 6) is a reference point for the protocol.

---

## 6. ToPSen (arXiv 2505.22414), DIS '25

**Read:** full text, arXiv **v1** (28 May 2025, 14 pp.), on 2026-10-12. This
is the DIS '25 paper; the ACM DOI printed on p. 1 (`10.1145/3715336.3735839`)
resolves to the ACM Digital Library.

**Study (confirmed).** 12 blind and 12 sighted participants, each group 4
novice and 8 expert Python programmers; 23 men, 1 woman (p. 4). One session of
60–90 minutes, paid USD 25 an hour (p. 5). Three tasks (p. 4):

1. Reading: predict the output, and state a statement's level and context
   hierarchy.
2. Fixing a syntax error.
3. Writing code from pseudocode.

Participants used a browser-based plain-text editor with text-to-speech,
modelled on Notepad++ (p. 4).

**Key result (confirmed).** Expert blind programmers actively keep structural
information in their mental model. They consciously track cursor position,
indentation level, and output structure (p. 9). On a first pass they read top
to bottom for a structural overview: line count, declared variables, and block
types (p. 6).

**Correction: "more accurate mental models."** The abstract says expert blind
programmers keep more accurate mental models and process more in working
memory (p. 1). The numbers are more specific than our summary implied:

- On the comprehension task, expert accuracy was **comparable**: 79.65% for
  blind experts against 77.4% for sighted experts under ToPSen. The sighted
  experts took about 30% longer (p. 5).
- In code writing, expert blind participants made fewer errors per block
  (0.40 against 1.50; Table 2).
- The paper concludes that **programming expertise, not familiarity with
  audio, decides comprehension success**. Novices in both groups scored under
  50% (pp. 5, 7).

Cite the specific metrics, not the general claim.

**Borrow (confirmed and strengthened).**

- The paper asks for tools that convey code structure directly, so users do
  not have to count indentation one character at a time (p. 7).
- Its design proposals include a **structural overview** at the top of a file
  (total lines, maximum nesting level and where it occurs, global variables,
  data types, statement types) and an explicit **"line N, level M"** cursor tag
  (pp. 10–11, Fig. 6). These are close precedents for `summarizeFile` and
  `describeSymbolAtCursor`. Caveat: they are proposed for mixed-ability
  collaboration and are **not evaluated** in the paper.
- *Working-memory bounds.* Expert blind participants handled more than 10
  statements and 4–5 levels in one overview, and two managed 15 statements
  and 6 levels (p. 6). The discussion puts the comfortable range at about 15
  statements across 3–5 nesting levels (p. 10). Task-4 consideration: when a
  summary would list more than about 15 names, speak the counts first and
  offer the list on demand.
- For novices, the authors suggest short logic summaries, possibly
  LLM-generated, as untested future work (p. 10). This is consistent with
  Baseer's LLM explanations sitting on top of structure, not replacing it.

**Avoid (confirmed).** The paper criticises blindfold simulation for producing
helplessness instead of capturing lived experience (pp. 2–3). ToPSen instead
gives sighted participants a technical framing, scripting on a headless server
with audio only, with no blindfold and the screen off (Fig. 1, p. 1; §1.1,
p. 2). If the AURAK study includes any sighted comparison group, it must use
that framing. "No result from sighted participants may stand in for a blind
participant's experience" is **Baseer's own rule**: consistent with the paper,
but not stated in it.

**Limitations to carry forward.** The indentation-counting findings are
specific to Python; languages that mark blocks with brackets may produce
different strategies (p. 12). That matters for task 6: the JavaScript fixtures
should not assume the Python results transfer. The study was a single session,
and the authors call for a longitudinal follow-up themselves (p. 12).

**Design decision supported.** *The narrator speaks structural position
(nesting depth, enclosing scope), and `verbose` includes line numbers.*
Confirmed (pp. 7, 9–11). The paper treats nesting level as a core part of the
expert mental model, not a detail, so task 4 should consider speaking it at
`normal` for `describeSymbolAtCursor`, not only at `verbose`. *AST narration
precedes LLM explanation in the build order.* Consistent with the paper:
structure comes first, and LLM summaries appear only as untested help for
novices.

---

## 7. Tripathi & Thakkar — *Accessibility Beyond Accommodations* (arXiv 2508.05056)

**Read:** full text, arXiv **v1** (7 Aug 2025, 14 pp.), on 2026-10-12. The
Springer DOI (`10.1007/978-3-032-14583-3_11`) resolves to a chapter with the
same title and authors, dated 2026; checked against the publisher's citation
metadata on 2026-10-12. The PDF itself carries no DOI and no affiliation.

**What it is. Correction: a design proposal, not an empirical study.** It
describes a five-component framework for an introductory CS course
(pp. 8–11):

1. Accessible lecture materials, handed out before class, plus a book of
   tactile diagrams.
2. Online tools.
3. A tactile learning kit.
4. A dedicated accessibility teaching assistant.
5. Psychosocial support.

The abstract says the framework was validated through expert consultation
(p. 1). The discussion describes that validation as ongoing, and says plainly
that the framework **lacks empirical validation** of learning outcomes
(pp. 11–12). It must not be cited as evidence that anything works.

**Central argument (confirmed).** Current approaches treat accessibility as
individual accommodations rather than as part of the design (pp. 1, 3, 5).

**Correction: "no specialised infrastructure."** This is a **requirement** the
framework sets itself (pp. 1, 6, 8), not something it achieves. The authors
concede it needs substantial investment in tactile materials, assistive
technology, and training. It also assumes 3D printing, a dedicated teaching
assistant, and an office of learning support: a high-resource setting
(pp. 11–12).

**Borrow (confirmed, and stronger than we recorded).**

- Its technical constraints require every interactive component to work with
  the major screen readers without custom configuration or special training
  (p. 7). Its recommended tools are **NVDA on Windows and VS Code** (p. 9).
  That supports delegating speech to the user's own screen reader inside
  VS Code more directly than the infrastructure argument we leaned on before.
- It criticises specialised audio programming environments for being cut off
  from mainstream practice (p. 5). That supports building inside VS Code
  rather than as a separate tool, and the "no web IDE in MVP" call.
- "No separate Braille code path" is **Baseer's inference**. The paper does not
  discuss Braille output paths in software.

**Avoid (confirmed, by analogy).** The paper argues against retrofitting
accessibility onto an existing design (p. 7). Applying that to a VS Code
extension, with no "blind mode" bolted onto a sighted-first tool, is our
analogy. The paper itself is about curricula.

**Design decision supported.** *Delegate speech to the user's existing screen
reader by default; in-extension TTS is strictly opt-in.* Confirmed through the
screen-reader-compatibility constraint and the NVDA and VS Code choice
(pp. 7, 9). It is also the cheapest correct choice, and the security model
reaches the same conclusion, since it avoids a second vendor API key.

**Relevance beyond the code.** Still the right citation for the
inclusive-design framing in the AURAK and RAK Excellence Awards narratives:
Baseer as inclusive design, not accommodation. Cite it as a position, and pair
it with Chen et al. and ToPSen for any empirical claim. Its dedicated teaching
assistant was set up with the institution's office of learning support
(p. 10), which parallels AURAK's Center for Learning Support Services, the
first recruitment channel for task 10.

---

## Cross-cutting conclusions

1. **The accessibility API gap is the project's biggest technical unknown.**
   Resolve it before writing command implementations — every command's output
   path depends on it.
2. **Structure-first is empirically grounded** (ToPSen pp. 7, 9). Build the
   AST narrator before the LLM layer, as the first-tasks order already has it.
3. **User-initiated speech by default** (Chen et al. pp. 16, 21). No ambient
   announcements. A single status cue while a user-requested LLM call is in
   flight is consistent with this (p. 15).
4. **Bundle everything, fetch nothing at runtime** (cursorless + selfint).
5. **Integrate, don't parallelise** (Tripathi & Thakkar pp. 7, 9). The user's
   screen reader is the output device.
6. **Output integrity is a need users state, not only our threat model**
   (Chen et al. pp. 14, 21). Blind participants said outright that they could
   not verify what the assistant told them. That grounds the LLM09 framing
   empirically.

## Open questions

1. ~~**Full texts.**~~ **Resolved 2026-10-12.** All three read in full. See
   `docs/papers/CHECKSUMS.txt` for the exact versions.
2. **Speech delivery mechanism.** The ADR-0001 spike was fixed (three bugs
   that would have produced false results) and is ready for the NVDA run.
   Results are tracked in GitHub issue #7. This still gates the accessibility
   contract.

## Verification summary (2026-10-12)

| Entry | Confirmed | Corrected | Baseer's inference, not the paper's |
|---|---|---|---|
| Chen et al. | Study design; three failure modes; ambient-speech harm; two-week shape | (c) rationale for `summarizeLastDiff` moves from §4.2.4 to §4.2.2; "four areas", not three; venue unconfirmed | ≤2-sentence chunking; "unrequested speech is the top complaint" (a11y skill) |
| ToPSen | Study design; expert blind participants track structure and position; blindfold critique | "More accurate mental models": comprehension accuracy was comparable (79.65% vs 77.4%). The gap is speed and errors, and expertise matters more than blindness | "No sighted result may stand in for a blind participant's experience" |
| Tripathi & Thakkar | Accommodation critique; the screen-reader-compatibility requirement | A design proposal with no empirical validation; "no specialised infrastructure" is a goal the authors concede is not met | "No separate Braille code path"; applying a curriculum argument to a software tool |

**No current Baseer design decision depends on a claim these papers do not
support.** Every decision still stands. What changed is some rationales, the
precision of some claims, and new support we had not cited (verifiability,
automation versus control, structural-overview precedents).
