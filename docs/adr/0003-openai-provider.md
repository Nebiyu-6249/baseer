# ADR-0003: OpenAI provider — SDK, API surface, and model selection

- **Status:** Draft. **`store: false` decided 2026-10-12** (see below). Model
  selection and revisiting the `openai` pin remain deferred to task 5 (LLM
  plumbing), per the instruction to pick models *at implementation time*.
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

## Decision (2026-10-12): `store: false` is mandatory

Decided by Nebiyu Gemedu.

**Rule.** Every request Baseer sends to the Responses API carries
`store: false`. It is a **constant in `src/llm/openai.ts`**, not a setting,
not a parameter of `LlmClient`, and not overridable by any configuration.
Task 5 adds a **unit test, against a mocked transport, asserting that every
outbound request body carries `store: false`**.

**Why.**

- **Client-code confidentiality.** OpenAI's data-controls page
  (`docs/openai-policy-snapshot.md`, retrieved 2026-10-11 20:40:56 UTC) says
  the Responses API keeps application state for **at least 30 days by
  default**, or whenever `store` is true. OpenAI's migration guide confirms
  that responses are stored by default (§4, "Decide when to store state").
  Users may point Baseer at a client's repository, which is why consent is
  per-workspace (THREAT_MODEL §2.2). A second 30-day copy of that code serves
  no Baseer feature.
- **AURAK ethics review.** The study protocol (task 10) must disclose every
  third-party copy of a participant's code. Removing the stored-response copy
  shrinks that disclosure to what Baseer cannot control.
- **A constant, not a setting.** A settings change or a compromised settings
  sync cannot turn storage back on. This is the same reasoning as the
  endpoint allow-list (THREAT_MODEL T4.2).

**What `store: false` does *not* remove.** From the same snapshot. The consent
copy must say both:

- **Abuse-monitoring logs.** They may contain prompts and responses, kept up to
  30 days, or longer if the law requires it or to prevent harm. Only Zero Data
  Retention or Modified Abuse Monitoring removes them, and both need OpenAI's
  approval.
- **Prompt caching.** Encrypted key/value tensors may be held in GPU-local
  storage as application state, not retained past 24 hours. Without Zero Data
  Retention, every query uses extended prompt caching. `store` does not
  control this.

**Consequences for task 5.** Verified 2026-10-12 against
`developers.openai.com/api/docs/guides/migrate-to-responses` §4 and
`…/guides/conversation-state`, "Manually manage conversation state".

- **Conversation state is client-side.** The docs present `store: true` as the
  way to keep state from turn to turn. With `store: false`, multi-turn
  `askAboutCode` keeps its history in Baseer and resends it each turn rather
  than chaining with `previous_response_id`. Every turn therefore re-sends
  code, which counts against the 8 KB cap and the budget per request.
- **Reasoning models:** to stay stateless, preserve and replay every returned
  reasoning item. They carry `encrypted_content` by default.
- Background mode is out of scope; nothing in the MVP needs it.

## Deferred to task 5

1. **Model selection.** One general-purpose and one cheaper fallback, with
   the date recorded. Cannot be finalised now: the SDK type union proves an
   id is *accepted*, not that it is available to this account, nor its price,
   context window, or deprecation status. Those live on OpenAI's models docs,
   now served from `developers.openai.com` and reachable as of 2026-10-12, but
   to be fetched at implementation time.
2. **Confirm the API surface** against the README again at implementation
   time, in case the recommendation has moved.
3. **Revisit the `openai` pin.** The extension host's Node version was
   measured on 2026-10-12: VS Code 1.141.0 runs **Node 24.21.0** inside a real
   extension host. So the open question is no longer the current host. It is
   the `engines.vscode` floor (`^1.96.0`), which still admits versions whose
   host runs Node 20. Moving to 7.x means raising that floor deliberately.

## Consequences

- Provider facts must be fetched every time, never recalled: there is no
  `openai-api` skill (see `docs/CLAUDE_SETUP.md`).
- All LLM code is unit-tested against a mocked transport. `api.openai.com` is
  reachable from the developer's machine (2026-10-12), so live calls are an
  end-to-end check on top of the tests, not a replacement for them. It was
  blocked from the original cloud container.
- The pin is deliberately conservative and should be revisited, not inherited
  silently.
