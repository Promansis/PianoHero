# Challenge Record: PH-DATA-001

- Challenger: Codex, fresh isolated fixture; no separate reviewer was available
- Date: 2026-07-11
- Baseline identity: 808e6739e55b5186e8a9565f2c4e9267c4894a6c plus chartered patch identity
- Original severity/confidence/status: P1, high, reproduced

## Claim Under Test

Filesystem failures after a database mutation leave partially applied library restore,
delete, or reset state while the API reports an error.

## Independent Reproduction

- Fresh setup/fixture: isolated AppDatabase and injected MIDI adapter under /tmp.
- Exact steps: fail the second backup staged-file commit, then separately fail delete
  and reset storage calls behind createBridgeRouter.
- Result and repeat count: imported database rows persisted without all MIDI files;
  delete/reset returned 500 after their database mutations. Each sequence ran once
  in a fresh fixture.
- Artifacts: PH-DATA-001 and Phase 2 lane report P2-DATA-001.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Adapter throws deterministic operation errors | Rejected; database state remains changed after the expected error |
| Fixture or stale-data artifact | Fresh database per scenario | Rejected; no prior state was reused |
| Intended runtime difference | Trace Electron and web handler ordering | Rejected; both use database-before-storage ordering |
| Duplicate root cause | Compare single-song staging path | Narrowed; importSong compensates a single commit, backup/delete/reset do not |
| Unsupported product condition | Use documented backup/delete/reset APIs | Rejected; all are supported core workflows |

## Calibration

- Actual reach/frequency: requires filesystem failure or interruption during a
  normal destructive/library operation.
- Recovery and data impact: records and files can disagree after an error; no
  transaction log or repair flow is exposed.
- Recommended severity/confidence: P1, high.

## Decision

- accepted
- Canonical finding if duplicate: PH-DATA-001
- Required ledger/report changes: link DATA-001, DATA-002, DATA-013 and the affected
  destructive/backup operations.
- Challenger signature/date: Codex, 2026-07-11.
