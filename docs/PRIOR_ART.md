# Prior art synthesis

Compiled 2026-08-21 during bootstrap.

> **Sourcing caveat — read this first.** `arxiv.org` and
> `code.visualstudio.com` are **blocked by this environment's egress
> policy**. The three academic entries below are built from abstracts,
> publisher metadata, and search-surfaced summaries — **not** from full
> texts. The VS Code accessibility guidance comes from the GitHub wiki
> mirror, not the official docs site. Everything marked *(unverified)* needs
> confirmation against the full text before it is cited in the ASSETS 2026
> submission. See "Open questions" at the end.
>
> Code repositories *were* read directly (READMEs and `package.json`) via
> `raw.githubusercontent.com`, so those findings are firsthand.

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

**Read:** abstract and summaries only *(full text blocked)*.

Longitudinal study, **16 blind and low-vision programmers**, using GitHub
Copilot: onboarding tutorial, a programming task, initial feedback, then a
two-week follow-up on how practice and perception evolved.

**Borrow.** The reported failure modes are a direct requirements list — AI
assistants helped with efficiency and closed some accessibility gaps, but
participants struggled to (a) *convey intent* to the model, (b) *interpret AI
outputs*, and (c) *manage multiple views while maintaining situational
awareness*. Baseer's answer to each:
- (a) commands are scoped to a concrete selection or cursor position, so
  intent is expressed by *where you are*, not by prose;
- (b) output is chunked into ≤2-sentence interruptible units in a fixed
  format, not free-form prose;
- (c) `summarizeLastDiff` exists precisely to restore situational awareness
  after an AI edit, without the user having to go find what changed.

**Avoid.** Copilot's inline-suggestion model — ambient, unrequested
completions that a screen reader user must discover and evaluate mid-flow.
Baseer's speech is **always user-initiated**. Nothing speaks on a timer or on
document change.

**Design decision supported.** *`summarizeLastDiff` is a core MVP command,
not a nice-to-have* — it targets the "situational awareness after AI edits"
gap this study names.

**Also supports** the two-week longitudinal shape for the AURAK study
(step 10): first-session reactions differ from settled practice, so a
single-session study would miss the real findings.

---

## 6. ToPSen (arXiv 2505.22414), DIS '25

**Read:** abstract and summaries only *(full text blocked)*. Published at
ACM DIS 2025; also on ACM DL (`10.1145/3715336.3735839`).

12 blind and 12 sighted participants coding non-visually. Key result:
**expert blind programmers actively maintain structural information as part
of their mental model** — consciously tracking cursor position, indentation
level, and output structure — and held more accurate mental models and more
in working memory than sighted participants coding non-visually.

**Borrow.** This is the strongest empirical justification for Baseer's core
premise. It says structure is *already* the unit blind programmers reason
in, so a tool that narrates AST structure is reinforcing an existing expert
strategy rather than imposing a new one. It also implies the narrator must
speak **position and nesting depth**, not just names and counts — those are
things experts are actively tracking and would otherwise have to maintain
manually.

**Avoid.** ToPSen's methodological warning applies to our own user study:
blindfold-style blindness simulation is unsound. Their design instead puts
sighted programmers under *real* conditions (writing Python on a headless
server with audio readout only) and reframes the sensory constraint as a
technical requirement rather than a disability. If the AURAK study includes
any sighted comparison group, it must use that framing — and no result from
sighted participants may stand in for a blind participant's experience.

**Design decision supported.** *The narrator speaks structural position
(nesting depth, enclosing scope), and `verbose` includes line numbers* —
because that is the information experts are already tracking. Also: *AST
narration precedes LLM explanation in the build order* (first tasks 3 and 4),
since structure is the load-bearing part.

---

## 7. Tripathi & Thakkar — *Accessibility Beyond Accommodations* (arXiv 2508.05056)

**Read:** abstract and metadata only *(full text blocked)*. Also published by
Springer (`10.1007/978-3-032-14583-3_11`).

A systematic redesign of an introductory CS curriculum for students with
visual impairments. Central argument: current approaches treat accessibility
as **individual accommodations bolted onto an existing design** rather than
as integral to the design itself, and the framework deliberately avoids
requiring specialised technical infrastructure.

**Borrow.** The "no specialised infrastructure" constraint is the right test
for Baseer: it must work with the screen reader the user already owns, in
the editor they already use, with no extra hardware and no separate Braille
code path. If a feature needs special equipment, it is an accommodation, not
a design.

**Avoid.** Framing Baseer as an assistive add-on. A "blind mode" toggled on
top of a sighted-first tool is the accommodation pattern this paper argues
against.

**Design decision supported.** *Delegate speech to the user's existing screen
reader by default; in-extension TTS is strictly opt-in.* We integrate with
the user's established setup rather than introducing a parallel one. This is
also the cheapest correct choice — and it is the same conclusion the security
model reaches, since it avoids a second vendor API key.

**Relevance beyond the code:** this is the strongest citation for the AURAK
framing and the RAK Excellence Awards narrative — Baseer as inclusive design,
not accommodation.

---

## Cross-cutting conclusions

1. **The accessibility API gap is the project's biggest technical unknown.**
   Resolve it before writing command implementations — every command's output
   path depends on it.
2. **Structure-first is empirically grounded** (ToPSen). Build the AST
   narrator before the LLM layer, as the first-tasks order already has it.
3. **User-initiated speech only** (Chen et al.). No ambient announcements.
4. **Bundle everything, fetch nothing at runtime** (cursorless + selfint).
5. **Integrate, don't parallelise** (Tripathi & Thakkar). The user's screen
   reader is the output device.

## Open questions — need your input

1. **Full texts.** `arxiv.org` is blocked here. For the ASSETS submission I
   should not cite papers I have only read abstracts of. Can you download the
   three PDFs and drop them in `docs/papers/` (gitignored), or paste the
   relevant sections? Highest value: ToPSen's design framework section, and
   Chen et al.'s findings on interpreting AI output.
2. **Speech delivery mechanism.** Given there is no public announce API, I
   need to test the candidates (notification / focused QuickPick / focused
   read-only editor / webview with ARIA live region) against NVDA on your
   Windows machine. I cannot test this in a headless Linux container. This
   should become ADR-0001 and it gates the accessibility contract.
