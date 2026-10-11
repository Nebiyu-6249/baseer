# Claude Code setup for Baseer

Records which Claude Code skills are active for this project, why, and what
was searched for but not found. Update this whenever a skill is added.

Last updated: 2026-10-12. Sessions moved from the cloud container to the
developer's Windows machine, and the environment and egress sections were
refreshed. Before that: 2026-08-22, the provider swap from Anthropic to
OpenAI.

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

| Need | Verified source | Reachable? (dev machine, 2026-10-12) |
|---|---|---|
| SDK version, recommended API surface | `raw.githubusercontent.com/openai/openai-node/master/README.md` | **Yes** |
| Package metadata, `engines`, dependency count | `registry.npmjs.org/openai` | **Yes** |
| Enumerated model ids | the `openai` tarball's own `resources/shared.d.ts` type union | **Yes** |
| Pricing, context windows, deprecations | OpenAI's models docs. The docs now live on `developers.openai.com`; `platform.openai.com/docs/…` paths redirect there (301) | **Yes**; host reachable. The models page itself has not been fetched yet; do that in task 5 |
| Data-retention policy (needed for consent copy) | `developers.openai.com/api/docs/guides/your-data` (301 from `platform.openai.com/docs/guides/your-data`) | **Yes**. Fetched 2026-10-12 and recorded in `docs/openai-policy-snapshot.md` |

The first three are enough to pin a version and choose an API surface. The
retention policy was the source material for **blocker B1**
(`docs/THREAT_MODEL.md` §9); it is now verified. Model pricing, context
windows, and deprecations are fetched at implementation time in task 5.

Recording the gap here rather than writing a thin `openai-api` skill from
memory: a skill asserting unverified model facts is worse than no skill,
because a future session would trust it.

## Gaps not filled by any skill

- **No NVDA/JAWS/VoiceOver automation exists** in this project's tooling or
  in any skill. Screen-reader verification is manual, on the developer's
  Windows machine. Nothing in CI can substitute for it.
- **VS Code is available on the developer's machine** (1.141.0). On
  2026-10-12 an extension-host test ran locally by launching `Code.exe` with
  `--extensionDevelopmentPath` and `--extensionTestsPath` and an isolated
  `--user-data-dir` (the ADR-0001 spike smoke test). So integration tests can
  run locally without adding `@vscode/test-electron` just to download VS Code.
  CI still needs `xvfb` on Linux.

## Environment — developer's Windows machine (verified 2026-10-12)

| Tool | Found | Notes |
|---|---|---|
| OS | Windows 11 Pro 10.0.26200 | |
| Node | v24.21.0 | |
| pnpm | 10.33.0 | Matches `packageManager` |
| npm | 11.19.0 | |
| git | 2.55.0.windows.3 | `core.autocrlf=true`; `.gitattributes` forces LF. No global identity is set, so Claude's commits pass `-c user.name/-c user.email` per commit |
| Python | 3.13.12 | Use the `py` launcher; `python` on PATH is the Microsoft Store stub |
| VS Code | 1.141.0 | Electron 43.7.7. **The extension host runs Node 24.21.0**, measured inside a real extension host. This bears on the `openai` 6.x pin (ADR-0003): the binding constraint is the `engines.vscode` floor, not current VS Code |
| `gh` | 2.102.0 | Authenticated as `Nebiyu-6249` (`repo`, `workflow` scopes) |
| `pdftotext` | bundled with Git for Windows | Used to read the anchor PDFs; the Read tool's PDF mode needs poppler, which is not installed |
| NVDA | being installed by the developer for the ADR-0001 run | Standard install, eSpeak NG Arabic voice. Not verified by Claude at the time of writing |

## Environment verified at bootstrap (historical: cloud container, 2026-08-21)

| Tool | Required | Found | Status |
|---|---|---|---|
| Node | >= 20 | v22.22.2 | OK. The "extension host is Node 20" note made here was an assumption, superseded by the measurement above |
| pnpm | any | 10.33.0 | OK |
| npm | — | 10.9.7 | OK |
| git | — | 2.43.0 | OK |
| Python | for grammar fixtures | 3.11.15 | OK |
| VS Code (`code`) | for manual + integration testing | **not installed** | Expected in a headless container; blocks integration tests here only |

## Network egress — developer's machine (2026-10-12)

Unrestricted. One `GET /` per host on 2026-10-12:

| Host | Result |
|---|---|
| `platform.openai.com` | Reachable. A plain GET gets a 403 bot wall, and docs paths 301 to `developers.openai.com`, which serves real content |
| `api.openai.com` | Reachable. 421 on a bare `GET /`, which is expected with no API path |
| `arxiv.org` | Reachable (200) |
| `code.visualstudio.com` | Reachable (200) |

Consequences, replacing the three under the historical section below:

1. The three anchor papers have been read in full. `docs/PRIOR_ART.md` §5–7
   carries page numbers, and `docs/papers/CHECKSUMS.txt` the exact versions.
2. OpenAI's data-retention terms are verified (`docs/openai-policy-snapshot.md`).
   Pricing, context windows, and deprecations are fetched in task 5.
3. Live LLM calls are possible from this machine once a key is stored via
   `baseer.setApiKey`. Unit tests still mock the transport. A live call is an
   end-to-end check, not a substitute for tests.

## Network egress — cloud container (historical, 2026-08-21/22)

Outbound HTTPS went through a policy-enforcing proxy. Verified at bootstrap:

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
