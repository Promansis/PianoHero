# Challenge Record: PH-MUS-004

- Challenger: Codex (acting), consolidation evidence review
- Date: 2026-07-30
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

When a MIDI input disappears while holding notes, the service updates the device
list but emits no source releases, leaving downstream visual/audio note state active.

## Independent Reproduction

- Fresh setup/fixture: in-memory fake `MIDIAccess` with one input and production
  `MidiInputService` subscriptions.
- Exact steps: emit Note On, remove the input, dispatch `statechange`, and record
  emitted note events and the device list.
- Result and repeat count: one deterministic service fixture emitted only
  `noteon:60` while the device count changed to zero.
- Artifacts: [finding report](../findings/PH-MUS-004.md) and
  [Phase 3 evidence](../phase-3-music-practice-correctness-2026-07-11.md#scoring-transport-and-input).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Use a fake Web MIDI object with no hardware or timing dependency. | The lifecycle callback ran deterministically. |
| Fixture or stale-data artifact | Confirm the production device subscription reports zero inputs. | Device removal was observed; note cleanup alone was absent. |
| Intended runtime difference | Trace both hosts to the shared MIDI input service and held-note consumers. | Both inherit the same source-lifecycle behavior. |
| Duplicate root cause | Compare PH-MUS-001's practice-state recreation. | Distinct: this is input-source disappearance. |
| Unsupported product condition | Check WF-002/RT-011 and the device picker behavior. | Disconnect/reconnect is explicitly in scope. |

## Calibration

- Actual reach/frequency: device removal while one or more notes are held.
- Recovery and data impact: session exit or another all-notes-off path recovers;
  no durable corruption was shown, so P2 remains appropriate.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: removing a source must release only notes
  owned by that source and preserve notes held by other sources.
- Recommended severity/confidence: P2 / high, with physical-device behavior still an
  explicit verification gap.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: retain PH-MUS-004 as the canonical MIDI
  source-disconnect lifecycle finding.
- Challenger signature/date: Codex (acting), 2026-07-30
