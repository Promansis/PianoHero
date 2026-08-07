# Challenge Record: PH-ARCH-001

- Challenger: Codex, isolated renderer failure fixture
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

A rejected GameScreen prerequisite bridge read leaves a practice session loading
without a visible recoverable error, even though later MIDI-read failures have a
visible error path.

## Independent Reproduction

- Fresh setup/fixture: disposable jsdom renderer harness, valid lesson-drill
  song, stubbed visual children only, no durable data.
- Exact steps: make `getSetting` reject with `storage unavailable`, mount
  GameScreen, open the session overlay with Escape, and inspect its status.
- Result and repeat count: one controlled attempt left `Loading song from the
  library.` visible and produced an unhandled rejection. The expected
  `Unable to load song: storage unavailable` message was absent.
- Artifacts: [Phase 6 probe evidence](../../evidence/phase-6-probes-2026-07-12.md#game-preflight-failure).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | The current full suite and both builds passed; the probe changes only one bridge promise. | Rejected. |
| Fixture or stale-data artifact | A lesson-drill fixture requires no persisted MIDI bytes or user data. | Rejected. |
| Intended runtime difference | The failing code is shared renderer logic reached through both AppBridge adapters. | Rejected. |
| Duplicate root cause | Compared with PH-MUS-001/003/004 and PH-UI-001. | Rejected; this is asynchronous failure handling and recovery. |
| Unsupported product condition | Practice loading is a core supported desktop workflow. | Rejected. |

## Calibration

- Actual reach/frequency: any transient settings, stats, or fingering bridge
  failure while opening a practice session.
- Recovery and data impact: no destructive mutation was observed; the user can
  escape and leave, but receives no useful loading failure state.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-ARCH-001 and link WF-008, WF-009,
  BR-015, BR-032, BR-053, and MOD-003.
- Challenger signature/date: Codex, 2026-07-12.
