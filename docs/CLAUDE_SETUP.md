# Claude Code setup for Baseer

Records which Claude Code skills are active for this project, why, and what
was searched for but not found. Update this whenever a skill is added.

Last updated: 2026-08-22 (provider swap Anthropic -> OpenAI).

## Skill audit performed at bootstrap

`ListSkills` and `SearchSkills` were run against the account's enabled
claude.ai skills with the keywords: *vscode extension, typescript
scaffolding, accessibility testing, npm security audit, tree-sitter,
anthropic sdk*.

**Result: zero matches.** The account's enabled skills are all
document/graphics oriented (`docx`, `pptx`, `xlsx`, `pdf`, `canvas-design`,
`brand-guidelines`, `morning`, `skill-creator`). None is relevant to this
project.

## Already available (plugin/system level — not created by us)

| Skill | Relevance to Baseer |
|---|---|
| ~~`claude-api`~~ | **No longer applicable.** Baseer swapped to OpenAI on 2026-08-22. This skill covers the Anthropic SDK only; do not consult it for provider facts. |
| `security-review` | Security review of pending changes on a branch. Use before each PR touching `src/llm/` or `src/security/`. |
| `code-review` | Correctness + simplification review of a diff. |
| `init` | Generates a `CLAUDE.md` for the repo. Run after the scaffold exists. |
| `session-start-hook` | Sets up a repo so web sessions can run tests/linters. Worth doing once CI exists. |
| `skill-creator` | Used to shape the project skills below. |

## Project skills created at bootstrap

Created under `.claude/skills/<name>/SKILL.md` (directory-with-SKILL.md is
the convention Claude Code actually loads; the bootstrap prompt suggested a
flat `.claude/skills/vscode-extension.md`, which would not be picked up).

| Skill | Purpose |
|---|---|
| `vscode-extension` | Extension API facts verified against `vscode.d.ts`, including the **verified absence** of `IAccessibleViewService` from the public API. Contribution points, SecretStorage, `l10n`, esbuild/activation gotchas. |
| `tree-sitter-wasm` | `web-tree-sitter` 0.25+ API break, where to source `.wasm` grammars and the supply-chain trade-off, UTF-16-vs-byte offset hazard, narration-relevant node types. |
| `a11y-screenreader` | Rules for writing speakable strings, verbosity contract, interruption, Arabic/RTL bidi isolation, keybinding collisions with NVDA/JAWS, the manual NVDA release checklist. |
| `llm-injection-defense` | `sanitizeUserContent()` contract, the ~20-payload detection corpus, normalisation-before-matching, budget/transport/logging rules, OWASP LLM Top 10 2025 mapping. |

These are deliberately written as *decisions and hazards*, not as tutorials.
They exist so a future session does not re-derive the same findings or, worse,
write code against an API that does not exist.

## Provider skill gap — OpenAI (opened 2026-08-22)

`SearchSkills` for *openai / openai node sdk / gpt api* returns **zero
results**. There is no `openai-api` counterpart to the `claude-api` skill, so
nothing supplies model ids, pricing, or parameter facts for our actual
provider.

Until one exists, provider facts must be **fetched, never recalled**:

| Need | Verified source | Reachable here? |
|---|---|---|
| SDK version, recommended API surface | `raw.githubusercontent.com/openai/openai-node/master/README.md` | **Yes** |
| Package metadata, `engines`, dependency count | `registry.npmjs.org/openai` | **Yes** |
| Enumerated model ids | the `openai` tarball's own `resources/shared.d.ts` type union | **Yes** |
| Pricing, context windows, deprecations | `platform.openai.com/docs/models` | **No — egress blocked** |
| Data-retention policy (needed for consent copy) | `openai.com` terms | **No — egress blocked** |

The first three are enough to pin a version and choose an API surface. The
last two are **blocker B1** in `docs/THREAT_MODEL.md` §9 — the first-run
consent copy cannot be finalised without them.

Recording the gap here rather than writing a thin `openai-api` skill from
memory: a skill asserting unverified model facts is worse than no skill,
because a future session would trust it.

## Gaps not filled by any skill

- **No NVDA/JAWS/VoiceOver automation exists** in this container or in any
  skill. Screen-reader verification is manual, on the developer's Windows
  machine. Nothing in CI can substitute for it.
- **No VS Code binary here** (`code` is not installed and this is a headless
  Linux container), so `@vscode/test-electron` integration tests cannot run
  in this session. They can run in GitHub Actions with `xvfb`.

## Environment verified at bootstrap

| Tool | Required | Found | Status |
|---|---|---|---|
| Node | >= 20 | v22.22.2 | OK — note the extension host is Node 20; do not use Node 22-only APIs |
| pnpm | any | 10.33.0 | OK |
| npm | — | 10.9.7 | OK |
| git | — | 2.43.0 | OK |
| Python | for grammar fixtures | 3.11.15 | OK |
| VS Code (`code`) | for manual + integration testing | **not installed** | Expected in a headless container; blocks integration tests here only |

## Network egress (this container)

Outbound HTTPS goes through a policy-enforcing proxy. Verified at bootstrap:

- Reachable: `registry.npmjs.org`, `api.github.com` (scoped to
  `nebiyu-6249/baseer` only), `raw.githubusercontent.com`, web search.
- **Blocked by org egress policy:** `arxiv.org`, `code.visualstudio.com`,
  and (as of the 2026-08-22 recheck) `platform.openai.com` and
  `api.openai.com`.

**Re-checked 2026-08-22** after egress exceptions were requested: all four
still fail. `arxiv.org` and `code.visualstudio.com` are unchanged; the two
OpenAI hosts are newly relevant and newly blocking.

Consequences:
1. The three anchor papers still cannot be read in full — the prior-art
   synthesis remains abstract-based and is marked as such in
   `docs/PRIOR_ART.md`.
2. OpenAI pricing, context windows, and data-retention terms cannot be
   verified here (blocker B1).
3. `api.openai.com` being blocked means **no live LLM call can be made from
   this container**. All LLM work must be unit-tested against a mocked
   transport; end-to-end verification happens on the developer's machine.
