# Challenge Record: PH-UI-003

- Challenger: Codex (Chrome and Electron reduced-motion pixel fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

Free Play and Soundboard decorative canvas scenes continue to animate while the
user's reduced-motion preference is active.

## Independent Reproduction

- Fresh setup/fixture: isolated browser and Electron profiles with no active notes.
- Exact steps: enable reduced motion, confirm `matchMedia`, hash canvas pixels, wait 750 ms, hash again.
- Result and repeat count: Free Play changed pixels in Chrome and Electron; Soundboard changed pixels in Chrome.
- Artifacts: Phase 5 P5-UI-003 hash records.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | DOM Settings transitions reduce to 0.01 ms under the same preference. | Rejected. |
| Fixture or stale-data artifact | Idle stages had no MIDI/computer-key input. | Rejected. |
| Intended runtime difference | Both runtime renderers changed Free Play pixels. | Rejected. |
| Duplicate root cause | Compared idle long-task trace and canvas source ownership. | Rejected; PH-UI-003 is preference propagation. |
| Unsupported product condition | Product and UI profile require reduced motion. | Rejected. |

## Calibration

- Actual reach/frequency: every motion-sensitive user entering Free Play or Soundboard.
- Recovery and data impact: exit/reload recovers; no durable mutation.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-UI-003 and link WF-015, WF-016, RT-009, MOD-006.
- Challenger signature/date: Codex, 2026-07-12.
