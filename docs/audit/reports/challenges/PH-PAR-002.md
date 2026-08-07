# Challenge Record: PH-PAR-002

- Challenger: Codex (controlled live-Chrome renderer fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

Cancelling browser picker-backed import methods leaves their promises pending instead of returning their Electron-equivalent cancellation result.

## Independent Reproduction

- Fresh setup/fixture: built web runtime in Chrome 149 with an isolated profile and no selected files.
- Exact steps: call `importMidiFiles`, dispatch the temporary input's cancellation path, wait 150 ms, inspect settlement.
- Result and repeat count: `{"cancelDispatched":true,"settled":false}`; repeated once using the same helper behavior.
- Artifacts: Phase 4 P4-PAR-002 command/result record.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Existing web bridge/import tests passed. | Rejected; normal selection paths work. |
| Fixture or stale-data artifact | Used an isolated renderer and a generated input. | Rejected; no persisted state participates. |
| Intended runtime difference | Compared native dialog cancel branches and renderer callers. | Rejected; callers already expect documented empty/`null` results. |
| Duplicate root cause | Compared with MIDI storage and backup findings. | Rejected; promise lifecycle precedes any durable operation. |
| Unsupported product condition | Checked ADR 0001/browser matrix. | Rejected; current desktop Chrome is supported. |

## Calibration

- Actual reach/frequency: any cancellation of MIDI import, reattach, or backup import in web.
- Recovery and data impact: no mutation; navigation/reload recovers the stuck UI.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-PAR-002 and link BR-008, BR-010, BR-058, WF-004, WF-006, WF-020, OP-001, OP-005, MOD-004, MOD-009.
- Challenger signature/date: Codex, 2026-07-12.
