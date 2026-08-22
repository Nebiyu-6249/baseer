# Baseer

**Screen-reader-first code narration and AI explanation for blind and
low-vision programmers, with Arabic support.**

Baseer narrates the *structure* of your code to your screen reader, and layers
an audio-first AI explainer on top of it. It is built for NVDA on Windows
first, then JAWS and VoiceOver.

> **Status: pre-alpha.** The scaffold is in place; no command is implemented
> yet. Speech delivery is an open question tracked in ADR-0001.

## Your code and your privacy

Read this before installing:

- Baseer sends **fragments of your source code to OpenAI** when you use an
  AI-backed command. It asks for explicit consent, per workspace, before the
  first such request, and never sends anything before you grant it.
- Structural commands (file summary, symbol description) are computed
  **locally** with tree-sitter and send nothing anywhere.
- Baseer collects **no telemetry.** No analytics, no error reporting, no
  usage pings. See `docs/THREAT_MODEL.md` §2.1.
- Your OpenAI API key is stored in your operating system's keychain via VS
  Code `SecretStorage` — never in settings, never in a file, never in the
  repository.
- Revoke consent at any time with **Baseer: Revoke Consent to Send Code to
  OpenAI**.

## Why structure comes from the parser, not the model

Counts, names, signatures, and nesting are derived from the syntax tree and
are always correct. Only the one-sentence "purpose" text comes from the LLM,
and it is labelled as such. A user at `terse` verbosity hears only ground
truth.

This is deliberate. A blind user cannot glance at the screen to catch a
hallucinated or manipulated explanation, so output integrity is treated as a
security property. See `docs/THREAT_MODEL.md` §1 and LLM09.

## Commands

| Command | Keybinding |
|---|---|
| Baseer: Summarize File | `Ctrl+Alt+B F` |
| Baseer: Describe Symbol at Cursor | `Ctrl+Alt+B D` |
| Baseer: Explain Selection | `Ctrl+Alt+B E` |
| Baseer: Summarize Last Diff | `Ctrl+Alt+B G` |
| Baseer: Ask About Code | `Ctrl+Alt+B A` |
| Baseer: Toggle Verbosity | `Ctrl+Alt+B V` |
| Baseer: Toggle Language | `Ctrl+Alt+B L` |
| Baseer: Stop Speaking | `Ctrl+Alt+Shift+S` |
| Baseer: Set OpenAI API Key | — |
| Baseer: Revoke Consent | — |
| Baseer: Purge Security Log | — |

Keybindings are **provisional** pending conflict testing against NVDA's and
JAWS's own modifier layers.

## Development

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

See `docs/CONTRIBUTING.md`.

## Documentation

| Document | Purpose |
|---|---|
| `docs/THREAT_MODEL.md` | Approved v1.0 — assets, adversaries, OWASP LLM mapping |
| `docs/PRIOR_ART.md` | What we borrowed, what we avoided, and why |
| `docs/CLAUDE_SETUP.md` | Tooling, skills, environment and egress constraints |
| `docs/adr/` | Architecture decision records |

## Licence

MIT — see `LICENSE`.
