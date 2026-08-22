# Contributing to Baseer

## Branch protection on `main` (to configure in repo settings)

`main` is not yet protected. Enable these before the first external
contribution:

- Require a pull request before merging; no direct pushes to `main`.
- Require the `build`, `audit`, and `gitleaks` CI checks to pass.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Dismiss stale approvals when new commits are pushed.
- Do **not** allow force pushes or deletion of `main`.

While Nebiyu is the sole contributor, the PR requirement mostly buys the CI
gate and a reviewable history. The gitleaks and audit checks are the parts
that matter most — they are the automated half of security requirements 2
and 8.

## Workflow

1. Branch from `main`. Use `feat/`, `fix/`, `docs/`, `chore/`, `spike/`.
2. Conventional-commit messages, one logical change per commit.
3. Architectural decisions get an ADR in `docs/adr/NNNN-*.md` **before**
   the code that implements them.
4. Open a PR. CI must be green.

## Before every push

```sh
pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test
```

## Accessibility gate — non-negotiable

No PR that changes user-facing output merges without NVDA verification on
Windows. Paste the Speech Viewer output into the PR. Automated tests cannot
substitute for this: nothing in CI can hear.

See `.claude/skills/a11y-screenreader/SKILL.md` for the rules any
user-facing string must satisfy, and `docs/ACCESSIBILITY.md` (from task 8)
for the release checklist.

## Security gate

- Secrets go through `src/security/secretStorage.ts`. Nowhere else.
- Anything sent to the LLM goes through `sanitizeUserContent()`.
- Never log user code, secret values, prompt text, or full LLM responses.
- New network calls to any host other than `api.openai.com` are rejected —
  see `docs/THREAT_MODEL.md` §2.1.
- Run `gitleaks detect --no-git --config .gitleaks.toml` locally if you are
  touching anything key-adjacent.

## Do not add scope

The MVP feature list in `BASEER_BOOTSTRAP_PROMPT.md` is a ceiling, not a
floor. Web IDE, accounts, payments, voice input, languages beyond Python and
JavaScript, multi-file refactoring, and file-modifying tool use are all
explicitly out. Propose, do not implement.
