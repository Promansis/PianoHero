# Challenge Record: PH-PAR-003

- Challenger: Codex (fresh real-migration and cross-runtime fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

A song created by the supported legacy JSON migration loads and recomputes in Electron but fails in web against the same durable state.

## Independent Reproduction

- Fresh setup/fixture: one valid MIDI external file plus one `song-metadata.json` entry in a fresh `/tmp` user-data directory.
- Exact steps: let Electron perform production migration, invoke load/recompute, then start web with the same directory and invoke the equivalent route/RPC calls.
- Result and repeat count: Electron loaded 614 bytes and updated one song; web listed the row but returned a missing app-owned-file 404 and zero updates. Repeated with a fresh migration profile.
- Artifacts: Phase 4 P4-PAR-003 command/result record.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Both hosts used the same generated database and valid MIDI fixture. | Rejected. |
| Fixture or stale-data artifact | Used the production `song-metadata.json` migration path, not a hand-written database record. | Rejected. |
| Intended runtime difference | Reviewed `Song` storage contract and UI recovery behavior. | Rejected; no visible migrated-file state documents this difference. |
| Duplicate root cause | Compared PH-DATA-001 and PH-DATA-003. | Rejected; no partial commit or content-ID issue is required. |
| Unsupported product condition | Checked charter support for Electron and desktop web. | Rejected. |

## Calibration

- Actual reach/frequency: users carrying legacy JSON metadata/source paths into a supported migration and then using web.
- Recovery and data impact: reattach can recover, but the row appears playable until load/recompute fails.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: source bytes and recompute should agree across hosts.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-PAR-003 and link BR-011, BR-059, DATA-002, WF-004, WF-006, WF-008, WF-009, OP-002, MOD-008, MOD-009.
- Challenger signature/date: Codex, 2026-07-12.
