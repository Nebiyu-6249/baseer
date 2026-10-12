# Baseer security notes

Where and how each security control is implemented, per the bootstrap spec.
`docs/THREAT_MODEL.md` remains the authority on *what* is required and
*why*. Sections are added here as controls land. Task 5 adds the
extension-side ones: secrets, sanitisation, budget, logging.

## CI supply chain

### Rule: nothing mutable runs with a secret

A reference that can be repointed — a branch (`@master`), a tag (`@v3`), or a
Docker tag (`:node`) — must not execute with a secret in its environment.
Actions that receive secrets are pinned to a **full commit SHA**; container
images that receive secrets are pinned to a **digest**.

### Snyk (`SNYK_TOKEN`)

- `.github/workflows/ci.yml`, job `snyk`, runs
  `snyk/snyk:node@sha256:<digest>` via `docker run`, with the same command
  (`snyk test`) and environment as the official action.
- It replaced `snyk/actions/node` on 2026-10-12. That action's `action.yml`
  runs `docker://snyk/snyk:node` **by tag**, so pinning the action's commit
  SHA did not freeze the image that actually sees the token. The tag really
  does move: Docker Hub reported it updated at 2026-10-11T00:06Z, the day
  before the pin.
- The job is non-blocking (`continue-on-error`). `SNYK_TOKEN` is a repository
  secret that only the repo owner adds. Never commit it or paste it into chat
  (issue #19).

### Bumping the Snyk image digest

Dependabot cannot update a digest inside a `run:` line, so this is manual.

**When:** at least monthly; whenever a Snyk security advisory affects the
CLI; or when the job warns that its CLI is out of date.

**How:**

1. Resolve the current digest two independent ways and confirm they match.
   Docker Hub's tag API:

   ```bash
   curl -s https://hub.docker.com/v2/repositories/snyk/snyk/tags/node | grep -oE '"(digest|last_updated)":"[^"]*"'
   ```

   The registry itself (the `docker-content-digest` header):

   ```bash
   TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:snyk/snyk:pull" | grep -oE '"token":"[^"]*"' | cut -d'"' -f4)
   ```

   ```bash
   curl -sI -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.oci.image.index.v1+json" https://registry-1.docker.io/v2/snyk/snyk/manifests/node | grep -i docker-content-digest
   ```

2. Replace the digest in `.github/workflows/ci.yml` (one occurrence). Keep the
   `:node` tag in the reference for readability; Docker uses the digest.
3. Open a PR named `ci: bump snyk image digest` whose description records the
   old digest, the new digest, the tag's `last_updated`, and the date checked.
4. Merge only if the Snyk job behaves: with the token set, it completes a
   scan; without it, it fails only with `401 Unauthorized (SNYK-0005)`.
5. Add a row to the table below.

| Date | Digest (`snyk/snyk:node`) | Tag `last_updated` | Change |
|---|---|---|---|
| 2026-10-12 | `sha256:1dd473f4936eaf1e8d2f4068aab09638faaaa8e8085a7ac999aa968c31372a0c` | 2026-10-11T00:06:25Z | Initial pin, replacing `snyk/actions/node` |

### SHA-pinned actions

**Every `uses:` in `.github/workflows/ci.yml` is pinned to a full commit
SHA.** Dependabot updates SHA-pinned actions and keeps the trailing
`# vX.Y.Z` comment in step, so these need no manual procedure. Each pin was
made behaviour-neutral on 2026-10-12: the SHA is the commit CI was already
downloading for the moving major tag.

| Action | Pinned to | Why it receives a secret |
|---|---|---|
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` | Its `token` input defaults to the job's `GITHUB_TOKEN`. `persist-credentials` defaults to `true`, writing it into the clone's git config |
| `gitleaks/gitleaks-action` | `e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0` | Given `GITHUB_TOKEN` explicitly in `env` |
| `actions/setup-node` | `949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` | Its `token` input defaults to `github.token`, used to download Node builds |
| `pnpm/action-setup` | `0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6.0.10` | None directly; it can read the token `checkout` persisted in `.git/config` |

**A real example of why tags are not pins.** pnpm released `v6.1.0`
(`ea17c68…`) on 2026-09-05 but never moved its `@v6` tag, which still points
at `v6.0.10`. So `@v6` silently meant "6.0.10", not "latest 6.x". The pin uses
6.0.10, the commit CI actually ran, so the pin is not also an upgrade. The
move to 6.1.0 is left to a Dependabot PR with its own CI run.

### Known gaps (not yet fixed)

- **`checkout` still persists the job token** (`persist-credentials`
  defaults to `true`), so every later step in a job can read it from
  `.git/config`. No job pushes, so the fix is `persist-credentials: false` on
  every `checkout`, once the gitleaks job is verified without it. The blast
  radius is limited: the workflow grants `GITHUB_TOKEN` only
  `contents: read`.
