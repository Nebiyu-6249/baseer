# OpenAI API data-retention policy — snapshot

Raw material for the first-run consent copy (THREAT_MODEL §2.2, blocker
**B1**). This is **not** the consent copy; that is written in task 5. Its job
is to let a reviewer check, months from now, whether the consent wording still
matches what OpenAI publishes.

## Source

| | |
|---|---|
| URL requested | `https://platform.openai.com/docs/guides/your-data` |
| Redirect | HTTP **301** → `https://developers.openai.com/api/docs/guides/your-data` (OpenAI moved its API docs to `developers.openai.com`) |
| Page title | *Data controls in the OpenAI platform* |
| Retrieved | **2026-10-11 20:40:56 UTC** = 2026-10-12 00:40:56 UTC+04:00 (Gulf Standard Time, local) |
| Method | `curl` GET, HTTP 200, server-rendered HTML; article text extracted locally |
| Public archive | Wayback Machine snapshot `20261011201343`: `https://web.archive.org/web/20261011201343/https://developers.openai.com/api/docs/guides/your-data`. Its text for every section below is **identical** to the retrieval above (same SHA256 after the same extraction). |
| Local verbatim copy | `docs/policy-snapshots/` (**gitignored**; see "Why no verbatim block" below) |

| Local file | SHA256 |
|---|---|
| `openai-your-data-sections-20261011T204056Z.txt` — the sections summarised below | `3c87560dd3cf3a52183754923b907dab5ae589eb66413394af8195b414f48dac` |
| `openai-your-data-fullpage-20261011T204056Z.txt` — whole article | `0cfaf70f5b620de47c8057718f95fb2060af6f0355a494a056dc109897b09e06` |

### Why no verbatim block

The page is OpenAI's copyrighted text, and this repository is public.
Committing whole sections would redistribute it. So the verbatim copy is kept
locally, like the papers in `docs/papers/`. The **public Wayback snapshot
above is the verbatim reference a reviewer diffs against.** It is permanent,
third-party-hosted, and identical to what was read. This file carries one short
exact quote plus a section-by-section summary with section names, so every
statement can be traced.

## What the page says — by section

Summarised, not quoted, except for the one marked quote.

1. **Introduction.** Data sent to the OpenAI API has not been used to train or
   improve OpenAI models since 1 March 2023, unless the customer explicitly
   opts in.
2. **"Types of data stored with the OpenAI API".** Two kinds: *abuse
   monitoring logs*, and *application state* (data some API features keep to
   complete a request).
3. **"Data retention controls for abuse monitoring".** Abuse monitoring logs
   may contain customer content, such as prompts and responses, plus metadata
   derived from it. By default they are generated for all API usage and are
   kept as follows:

   > **Exact quote:** "retained for up to 30 days, unless longer retention is
   > required by law"

   The same sentence continues with a second exception: or where reasonably
   necessary to protect OpenAI's services or a third party from harm.
4. **Zero Data Retention / Modified Abuse Monitoring.** These remove customer
   content from abuse monitoring logs, but only for **eligible customers with
   OpenAI's prior approval**, arranged through sales. An individual developer
   using their own API key does **not** have either by default.
5. **`/v1/responses` (endpoint notes).** Not used for training. Abuse
   monitoring retention is 30 days. Separately, **application state is kept
   for at least 30 days by default, or whenever `store` is true.** Zero Data
   Retention forces `store` to false. Prompt caching may hold encrypted
   key/value tensors on GPU-local storage, gone after 24 hours. Without Zero
   Data Retention, all queries use extended prompt caching on supported models.

## Paraphrase for the consent copy — DRAFT, not final

Plain English, written to be **heard** through a screen reader: short
sentences, front-loaded, no URLs read aloud. Compare it line by line against
§3–5 above and the Wayback snapshot.

> When you ask Baseer to explain code, it sends that piece of code to OpenAI
> over an encrypted connection. OpenAI says it does not use code sent this way
> to train its models, unless your OpenAI account has opted in to share data.
> Baseer always tells OpenAI not to store its answers. Two things remain that
> Baseer cannot switch off. First, OpenAI may keep what Baseer sends, and what
> it sends back, in safety logs for up to 30 days, or longer if the law
> requires it or to prevent harm. Second, OpenAI may hold an encrypted copy of
> the request in a short-term cache for up to 24 hours. Only organisations
> that OpenAI has approved can turn the safety logs off.

**Why "not to store its answers" and not "opts out of application-state
retention".** `store: false` (mandatory since 2026-10-12, ADR-0003) removes
the Responses API's stored-response copy, which is otherwise kept for **at
least 30 days** (§5). OpenAI also classifies the prompt-cache tensors (§5) as
application state, and `store` does not control them. Saying Baseer opts out
of *all* application-state retention would overstate it.

**Before shipping (task 5):** confirm the sentence about `store` against the
code and its unit test, not against this file.

## Implications for task 5

1. **`store: false` on every Responses API call: DECIDED 2026-10-12.** It is
   mandatory, a constant in `src/llm/openai.ts` rather than a setting, with a
   unit test asserting every outbound request carries it. The reasoning and
   consequences are recorded in ADR-0003, including that multi-turn chat must
   then keep conversation state client-side.
2. **Do not imply Zero Data Retention.** It requires OpenAI's approval of the
   user's organisation (§4). The consent copy must describe the default 30-day
   logs.
3. **"Up to 30 days" is not "30 days then deleted".** The legal-hold and
   harm-prevention exceptions (§3) must survive any shortening of the copy.
4. **Re-verify at implementation time and before each release.** Fetch the
   live page, compare §3–5 against this file, and update the snapshot (new
   timestamp, new hashes, new archive link) if anything changed.

## How to re-check later

- **Anyone:** open the live URL and the Wayback snapshot side by side, and
  compare the sections named in §1–5.
- **On the development machine:** re-extract the live page and diff it against
  `docs/policy-snapshots/openai-your-data-sections-20261011T204056Z.txt`.
  First confirm the local file's SHA256 matches the table above, so you know
  you are diffing against what was actually read.
