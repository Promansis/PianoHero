# PH-DATA-001: Cross-Store Destructive Operations Commit SQLite Before Filesystem Work

- Lane: persistence
- Severity: P1
- Confidence: high
- Status: fixed
- Owner: Codex (acting)
- Challenger: Codex, fresh isolated-fixture challenge
- Verifier: independent fresh-context verification agent; full runtime workflow proof pending
- Affected runtime: both
- Coverage rows: DATA-001, DATA-002, DATA-013, OP-002, OP-005, OP-007, OP-009, OP-015
- Related/duplicate findings: none
- First observed against: 808e6739e55b5186e8a9565f2c4e9267c4894a6c plus the chartered audit patch identity

## User Impact

Library restore, song deletion, and full reset report failure after SQLite has already
performed the destructive or import mutation when subsequent MIDI storage work fails.
Restore can leave rows pointing at MIDI files that were never committed. Delete can
remove the library record while leaving its file orphaned. Reset can erase database
state while returning an error because files were not reset. These are core library
and recovery workflows with no durable rollback or repair record, making the issue
P1.

## Expected Behavior Or Oracle

The audit requires multi-step durable mutations to be atomic or to leave an explicit,
recoverable state. Backup import must validate and stage before committing, then either
complete all durable stores or preserve/recover the prior library state. Destructive
operations that return failure must not silently commit an unrecoverable subset.
See docs/agents/lumakeys-runtime-data-audit.md.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime: Linux x86_64, Node v24.15.0.
- Data profile/fixture: fresh disposable AppDatabase and fake MIDI adapter under /tmp.
- Hardware: none.

### Reproduction

Backup import:

1. Build a valid v2 backup containing two safe song IDs and staged MIDI entries.
2. Use an adapter whose first staged commit succeeds and second commit throws.
3. Call importLibraryBackup.
4. It throws, but both database rows remain with final MIDI paths and only the first
   MIDI file committed.

The isolated probe printed:

    {"error":"simulated second commit failure","firstRow":"/app-midi/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.mid","secondRow":"/app-midi/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789.mid","committedMidiIds":["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]}

Delete and reset:

1. Add a song to a fresh database.
2. Route deleteSong and resetUserData through createBridgeRouter with an adapter
   whose delete or reset rejects.
3. Each request returns 500 after its database mutation has completed.

The isolated probe printed:

    {"deleteStatus":500,"songExistsAfterDeleteFailure":false,"resetStatus":500,"songCountAfterResetFailure":0}

### Artifacts

- Backup commits database data before each staged file:
  src/persistence/libraryBackup.ts:136-139.
- Web delete/reset perform database mutation before storage work:
  src/server/bridgeRouter.ts:355-373.
- Electron has the same ordering:
  src/main/index.ts:133-137 and src/main/index.ts:336-342.
- Existing positive controls prove single-song import and reattach compensate for a
  failed staged-file commit: src/persistence/importSong.test.ts.
- Isolated reproduction commands/results: Phase 2 lane report, P2-DATA-001.

## Root Cause

SQLite and app-owned MIDI storage are treated as independent success paths. The
database transaction ends before the filesystem action, and the caller neither
compensates a subsequent filesystem failure nor writes a recovery journal. Library
backup import has the same problem across multiple staged commits.

## Recommended Remediation Boundary

Introduce a narrowly scoped cross-store mutation protocol for library restore,
song/bulk deletion, and full reset. It must preserve old records/files until all
required filesystem work succeeds, or persist an explicit operation journal that
startup can deterministically finish or roll back. Keep the already-correct
single-song staging semantics as the reference; do not replace SQLite transactions
with broad best-effort error handling.

## Required Regression Proof

- Deterministic unit/integration proof: injected failure on every staged restore
  commit, delete, bulk delete, and reset leaves either the old complete state or an
  explicit recoverable operation record.
- Electron proof: disposable profile, forced filesystem failure, restart, and
  integrity comparison.
- Web proof: isolated data root, failed request, restart, retry, and integrity
  comparison.
- Data/recovery proof: backup before/after checks include rows, MIDI files, folders,
  playlists, settings, and missing-file reports.
- Manual hardware/UI proof: import/reset error message includes a safe retry/recovery
  path.
- Broader regression command: npm test, npm run build, and npm run build:web.

## Challenge Record

- Independent reproduction attempt: ../challenges/PH-DATA-001.md.
- Alternative explanations tested: a database-side failure is already safe because
  staged files are discarded before commit; the failure appears only after the
  database transaction succeeds.
- Scope/severity changes: the finding was widened from backup restore to the shared
  database-before-filesystem operation pattern after delete/reset injection.
- Deduplication decision: canonical persistence finding for these cross-store flows.

## Resolution

- Accepted rationale: direct fault injection shows an error response with committed,
  inconsistent durable state.
- Fix branch/commit/issue: `d5839aa`, verified implementation in `d4ba395`.
- Verification evidence: fault-injection tests, independent source review, and real SIGKILL delete/reset/restore recovery pass; complete Electron/web UI retry and full library integrity matrices remain in [Phase 10](../phase-10-verification-2026-08-07.md).
- Residual risk: host-level filesystem failure messaging and full user-driven backup/reset recovery are not yet verified.
- Revisit trigger: before backup/restore or destructive-data release sign-off.
