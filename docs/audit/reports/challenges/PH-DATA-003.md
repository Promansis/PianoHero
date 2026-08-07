# Challenge Record: PH-DATA-003

- Challenger: Codex (acting), consolidation evidence review
- Date: 2026-07-30
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

A shape-valid v2 backup can name a SHA-256 song ID while embedding different MIDI
bytes, and restore accepts the mismatch without preserving the content-addressed
song identity invariant.

## Independent Reproduction

- Fresh setup/fixture: disposable database/MIDI root and a v2 backup whose declared
  byte length is correct but whose bytes hash to a different ID.
- Exact steps: import the backup, read the stored bytes, and compare their SHA-256
  with the restored song ID.
- Result and repeat count: one deterministic isolated fixture was accepted and the
  stored content hash did not match the song ID.
- Artifacts: [finding report](../findings/PH-DATA-003.md) and
  [Phase 2 evidence](../phase-2-runtime-data-security-2026-07-11.md#p2-data-003-v2-backup-content-identity).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Use an in-process disposable database and storage root. | Import completed normally; no environment failure occurred. |
| Fixture or stale-data artifact | Derive the named ID and embedded bytes independently in a fresh fixture. | The mismatch remained deterministic. |
| Intended runtime difference | Trace both runtime adapters to the shared backup importer. | Both inherit the same omitted validation. |
| Duplicate root cause | Compare PH-DATA-001's post-mutation recovery problem. | Distinct: this is missing validation before mutation. |
| Unsupported product condition | Validate the fixture against the documented v2 backup shape. | It is shape-valid and uses the supported restore path. |

## Calibration

- Actual reach/frequency: damaged or substituted v2 backups; normal round trips are
  unaffected.
- Recovery and data impact: restore succeeds with silently wrong content, but users
  can re-import or restore another backup; P2 is proportionate.
- Security attacker capability, if relevant: possession or modification of an
  imported backup file; no stronger integrity/authenticity guarantee is claimed.
- Music-correctness oracle, if relevant: stored bytes must hash to the content ID.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: retain PH-DATA-003 as the canonical v2 backup
  content-identity finding.
- Challenger signature/date: Codex (acting), 2026-07-30
