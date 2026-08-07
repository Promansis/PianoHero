# Challenge Record: PH-DATA-002

- Challenger: Codex (acting), consolidation evidence review
- Date: 2026-07-30
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

A successful full user-data reset leaves app-owned instrument sample packs in the
Electron filesystem and the web IndexedDB pack store, despite reporting that all
user data was deleted.

## Independent Reproduction

- Fresh setup/fixture: disposable Electron user-data and Chrome profiles under
  `/tmp`, with one sentinel pack in each runtime-specific store.
- Exact steps: perform the production reset sequence, then inventory the desktop
  pack directory and query web pack status after `localStorage.clear()`.
- Result and repeat count: one isolated run per runtime retained the pack; the web
  bridge continued to report it installed.
- Artifacts: [finding report](../findings/PH-DATA-002.md) and
  [Phase 2 evidence](../phase-2-runtime-data-security-2026-07-11.md#p2-data-002-reset-store-inventory).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Inspect the completed SQLite/MIDI/localStorage reset steps. | Those steps completed; only the unowned pack stores remained. |
| Fixture or stale-data artifact | Use fresh profiles and create one sentinel immediately before reset. | The sentinel remained in both profiles. |
| Intended runtime difference | Compare the UI success copy and chartered durable-state inventory. | Both promise a full reset; neither excludes sample packs. |
| Duplicate root cause | Compare PH-DATA-001's operation ordering with the absent pack-store operations. | Distinct: no pack reset is attempted here. |
| Unsupported product condition | Trace Settings' `Delete User Data` flow. | Full reset is an in-scope supported workflow. |

## Calibration

- Actual reach/frequency: every full reset after a sample-pack installation.
- Recovery and data impact: recoverable by separate pack removal or profile cleanup;
  retained storage and misleading reset state justify P2.
- Security attacker capability, if relevant: none required.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: retain PH-DATA-002 as the canonical sample-pack
  reset-lifecycle finding.
- Challenger signature/date: Codex (acting), 2026-07-30
