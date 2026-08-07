# Challenge Record: PH-OPS-001

- Challenger: Codex, disposable Docker build-context fixture
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P1 / high / reproduced

## Claim Under Test

The production Docker build can embed default application data and environment
files from a developer checkout into an image layer.

## Independent Reproduction

- Fresh setup/fixture: a `/tmp` Docker context with only a fake
  `.lumakeys-data/sentinel`, a fake `.env`, and the production
  `.dockerignore` contents.
- Exact steps: use `COPY . .` followed by `RUN test -f
  .lumakeys-data/sentinel && test -f .env`, then run a no-cache Docker build.
- Result and repeat count: one disposable build passed; the temporary image and
  context were removed immediately.
- Artifacts: [Phase 6 probe evidence](../../evidence/phase-6-probes-2026-07-12.md#docker-build-context).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Docker completed the isolated build successfully. | Rejected. |
| Fixture or stale-data artifact | The fixture contains only synthetic sentinel files. | Rejected. |
| Compose data mount prevents exposure | Compose mounts `/data`; copied default data remains under `/app/.lumakeys-data` in the image layer. | Rejected. |
| Duplicate root cause | Compared with PH-DATA-001/002 and PH-PAR-001. | Rejected; this is build-context confidentiality. |
| Unsupported product condition | Docker deployment is explicitly documented and in scope. | Rejected. |

## Calibration

- Actual reach/frequency: any developer who has run web mode in the checkout or
  stored a local environment file before a Docker build.
- Recovery and data impact: an image can be cached, shared, or pushed with MIDI,
  SQLite data, or secrets not intended for distribution.
- Security attacker capability, if relevant: access to the built image, registry,
  image cache, or source history after an accidental commit.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P1 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-OPS-001 and link OP-014 and MOD-012.
- Challenger signature/date: Codex, 2026-07-12.
