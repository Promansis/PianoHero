# PH-OPS-001: Docker Build Context Can Embed Default User Data And Environment Files

- Lane: operations
- Severity: P1
- Confidence: high
- Status: accepted
- Owner: remediation owner TBD
- Challenger: Codex, disposable Docker build-context challenge
- Verifier: independent verifier required
- Affected runtime: web
- Coverage rows: OP-014, MOD-012
- Related/duplicate findings: none
- First observed against: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity

## User Impact

Running web mode from a checkout creates the default `.pianohero-data` root
unless `PIANOHERO_DATA_DIR` is supplied. A later Docker build copies that root,
including SQLite and MIDI data, into an image layer. The same build context also
accepts `.env` files. Cached, shared, or registry-pushed images can therefore
disclose personal practice data or deployment secrets. The exposure requires a
local build with such files present, but that is a documented deployment workflow
and has no automatic recovery, so it is P1.

## Expected Behavior Or Oracle

`CONTEXT.md` treats SQLite, app-owned MIDI bytes, and storage lifecycle as durable
state that must not be used by audit or delivery flows. Docker deployment must
package application inputs only; user data and environment secrets must be
excluded from source control and image build contexts.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime/browser: Linux x86_64, Docker 29.5.3.
- Data profile/fixture: disposable `/tmp` Docker context with synthetic sentinel
  files only; no application database, MIDI, or real environment secret.

### Reproduction

1. Copy the production `.dockerignore` contents into a disposable Docker context.
2. Add only `.pianohero-data/sentinel` and `.env` with synthetic values.
3. Build a minimal image that uses `COPY . .` and asserts both files are present.
4. Observe a successful no-cache Docker build.

`git check-ignore -v` exited 1 for both `.pianohero-data/audit-sentinel` and
`.env`, confirming the repository also provides no matching ignore rule.

### Artifacts

- The server's default persistent root is
  `src/server/index.ts:14` through `:16`.
- Docker copies the full remaining context at `Dockerfile:11`.
- `.dockerignore` lists only node_modules, build output, `.git`, `.claude`, and
  npm debug logs at `.dockerignore:1` through `:6`.
- `docker compose config` confirms the production mount is `/data`, which does
  not erase copied `/app/.pianohero-data` image content.
- Full synthetic-fixture command/result:
  [Phase 6 evidence](../../evidence/phase-6-probes-2026-07-12.md#docker-build-context).

## Root Cause

The delivery module uses broad-copy packaging without a deny list or allow list
for durable state and secret files. The runtime's default data location lies
inside that context, while neither Docker nor Git ignores it. Configuration and
data ownership therefore leak across the build seam into distributable image
layers.

## Recommended Remediation Boundary

Exclude `.pianohero-data`, SQLite/MIDI data roots, `.env*`, audit/browser
profiles, and other local state in `.dockerignore` and `.gitignore`. Prefer a
narrow Docker `COPY` allow list or multi-stage build input policy. Add an
automated build-context/image assertion with synthetic data and secret sentinels;
do not test it with real user files.

## Required Regression Proof

- Deterministic unit/integration proof: a synthetic `.pianohero-data` and
  `.env` are absent from the Docker build context and final image.
- Electron proof: not applicable.
- Web proof: a built container starts with only its `/data` mount as persistent
  state and can serve a fresh isolated profile.
- Data/recovery proof: image inspection shows no SQLite, MIDI, sample-pack, or
  backup bytes from the checkout; a mounted `/data` restart remains intact.
- Manual hardware/UI proof: not applicable.
- Broader regression command: `docker compose config`, image build/context test,
  `npm test`, and `npm run build:web`.

## Challenge Record

- Independent reproduction attempt:
  [PH-OPS-001 challenge](../challenges/PH-OPS-001.md).
- Alternative explanations tested: Compose's `/data` mount does not cover the
  copied application-directory data; only synthetic files were used.
- Scope/severity changes: covers default data and environment files, not just
  the visible Docker Compose bind mount.
- Deduplication decision: distinct delivery-confidentiality root cause from
  PH-DATA-001/002 and PH-PAR-001.
- Challenger conclusion and date: accepted as P1, 2026-07-12.

## Resolution

- Accepted/rejected rationale: a no-cache Docker build demonstrably embeds both
  sentinel classes under the current delivery rules.
- Fix branch/commit/issue: not authorized during discovery.
- Verification evidence: pending remediation and independent P1 verifier.
- Residual risk: local data or secrets can leak through a built image or source
  history until build-context and ignore policy are hardened.
- Revisit trigger, if accepted-risk: not applicable.
