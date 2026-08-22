# ADR-0003: OpenAI provider — SDK, API surface, and model selection

- **Status:** Draft — research recorded, final decision deferred to task 5
  (LLM plumbing), per the instruction to pick models *at implementation time*.
- **Date:** 2026-08-22
- **Supersedes:** the Anthropic Claude choice in the original tech stack.

## Context

The project swapped provider from Anthropic Claude to OpenAI. The `LlmClient`
interface is unchanged and stays provider-agnostic; only the implementation
moves. This ADR records what was verified during the swap so the final
decision in task 5 rests on evidence rather than recall.

## Verified 2026-08-22

Everything here came from a primary source that was actually fetched, not
from memory.

### SDK

| Fact | Value | Source |
|---|---|---|
| Package | `openai` | npm registry |
| Latest | `7.5.0`, published 2026-08-17 | `registry.npmjs.org/openai` |
| Runtime dependencies | **none** (both 6.49.0 and 7.5.0) | package metadata |
| `engines.node` on 7.x | `>=22.0.0`, introduced in `7.0.0` (2026-07-27) | version scan |
| Last release with no `engines` constraint | `6.49.0` (2026-07-23) | version scan |

Zero runtime dependencies is a meaningful supply-chain win against ADV-1 —
it is a strictly smaller attack surface than the previous SDK choice.

### API surface

The `openai-node` README's **first** example uses `client.responses.create(...)`,
with `chat.completions` shown afterwards. The Responses API is therefore the
one OpenAI leads with, and `resources/responses/` is present in both 6.49.0
and 7.5.0. `stream?: boolean` exists on the Responses request type, so
streaming is supported there.

**Provisional choice: the Responses API.**

### Model ids

`platform.openai.com` is **blocked** by this environment's egress policy, so
the model list came from the SDK's own type union
(`package/resources/shared.d.ts`) — authoritative for *which ids the SDK
accepts*, and fetched rather than recalled.

Ids present in the 6.49.0 type union include the `gpt-5.4`, `gpt-5.5`
(incl. `gpt-5.5-pro`) and `gpt-5.6-*` families, plus `gpt-5.x-mini` and
`-nano` variants and the `o1`/`o3`/`o4-mini` reasoning line. The README's own
example uses `gpt-5.5`.

## Decision (pinned now)

**`openai` is pinned to exactly `6.49.0`** — not `7.5.0`, and not a caret
range.

Reasoning: 7.x requires Node >= 22. The VS Code extension host's Node version
could not be verified from this container — VS Code `main` is 1.135.0 with
Electron 42.8.1 and builds on Node 24.18.0, so it is certainly above Node 20,
but the exact bundled Node version is unconfirmed (the `electron/releases`
dataset only covers up to Electron 22). `6.49.0` carries no engine constraint,
has the same zero dependencies, and exposes the same Responses API, so it
costs nothing to be safe here.

## Deferred to task 5

1. **Model selection.** One general-purpose and one cheaper fallback, with
   the date recorded. Cannot be finalised now: the SDK type union proves an
   id is *accepted*, not that it is available to this account, nor its price,
   context window, or deprecation status. Those live on
   `platform.openai.com`, which is blocked.
2. **Confirm the API surface** against the README again at implementation
   time, in case the recommendation has moved.
3. **Confirm the extension host's Node version** empirically
   (`process.versions.node` in the Extension Development Host). If it is
   >= 22, reconsider moving the pin to 7.x.

## Consequences

- Provider facts must be fetched every time, never recalled: there is no
  `openai-api` skill (see `docs/CLAUDE_SETUP.md`).
- No live LLM call can be made from this container — `api.openai.com` is
  blocked too. All LLM code must be unit-tested against a mocked transport,
  with end-to-end verification on the developer's machine.
- The pin is deliberately conservative and should be revisited, not inherited
  silently.
