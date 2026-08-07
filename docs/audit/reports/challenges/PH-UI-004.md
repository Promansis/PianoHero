# Challenge Record: PH-UI-004

- Challenger: Codex (Chrome and Electron confirmation fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

Escape in a Settings destructive confirmation both cancels the dialog and invokes
the app-level back navigation to Main Menu.

## Independent Reproduction

- Fresh setup/fixture: isolated Chrome web and Electron profiles; no confirmation was accepted.
- Exact steps: open Settings > Practice > Delete User Data, verify Cancel focus, press Escape once.
- Result and repeat count: both runtimes landed at Main Menu; no reset action was observed.
- Artifacts: Phase 5 P5-UI-004 screenshot and source trace.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Reproduced in two fresh runtime profiles. | Rejected. |
| Fixture or stale-data artifact | Settings confirmation does not depend on song fixture state. | Rejected. |
| Intended runtime difference | Global handler runs in the shared renderer path. | Rejected. |
| Duplicate root cause | Compared focus containment separately. | Rejected; PH-UI-001 is distinct. |
| Unsupported product condition | UI profile requires keyboard Escape and contextual back behavior. | Rejected. |

## Calibration

- Actual reach/frequency: keyboard cancellation of any affected destructive confirmation.
- Recovery and data impact: no observed reset; user must reopen Settings and locate the prior tab.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-UI-004 and link WF-018, WF-021, WF-022, WF-024, RT-008, MOD-002, MOD-005.
- Challenger signature/date: Codex, 2026-07-12.
