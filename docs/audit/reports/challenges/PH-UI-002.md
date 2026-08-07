# Challenge Record: PH-UI-002

- Challenger: Codex (fresh Chrome and Electron zoom fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P1 / high / reproduced

## Claim Under Test

Required 150-200% desktop zoom clips Settings tabs so non-default sections cannot
be pointer selected or visibly keyboard navigated.

## Independent Reproduction

- Fresh setup/fixture: isolated Chrome web and Electron renderer profiles.
- Exact steps: open Settings under the 150% effective desktop viewport and hit-test Visual's visible-layout center.
- Result and repeat count: Chrome tablist was `894x4`; Electron was `879x4`; both center hit tests resolved to no tab. Chrome repeated at 175% and 200%.
- Artifacts: Phase 5 P5-RT-001 screenshots and hashes.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Fresh built web and Electron renderers showed the same geometry. | Rejected. |
| Fixture or stale-data artifact | Settings does not depend on imported songs or durable fixture state. | Rejected. |
| Intended runtime difference | Same shared renderer CSS and direct Electron reproduction. | Rejected. |
| Duplicate root cause | Compared modal and Escape defects. | Rejected. |
| Unsupported product condition | Charter and ADR 0001 explicitly require 150-200% zoom. | Rejected. |

## Calibration

- Actual reach/frequency: any Settings user at 150%, 175%, or 200% desktop zoom.
- Recovery and data impact: no data corruption; users cannot reach necessary configuration sections through the UI.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P1 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-UI-002 and link WF-003, WF-018, WF-019, WF-021, WF-022, RT-006, RT-008, MOD-005, MOD-007.
- Challenger signature/date: Codex, 2026-07-12; independent remediation verifier pending.
