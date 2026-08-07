# Challenge Record: PH-MUS-003

- Challenger: Codex (acting), consolidation evidence review
- Date: 2026-07-30
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

A custom fingering saved from a looped or filtered session uses a transient
`scheduledIndex`, so reopening the full song can apply the override to a different
source note.

## Independent Reproduction

- Fresh setup/fixture: in-memory two-note, two-bar parsed song with a bar-two loop
  and one custom fingering row.
- Exact steps: save the visible loop note at scheduled index zero, then construct a
  full-song schedule using the same persisted record.
- Result and repeat count: one deterministic fixture moved finger 5 to the first
  full-song note while the edited bar-two note reverted to its generated fingering.
- Artifacts: [finding report](../findings/PH-MUS-003.md) and
  [Phase 3 evidence](../phase-3-music-practice-correctness-2026-07-11.md#fingering).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Use pure in-memory scheduling with no bridge, database, or audio. | The remap reproduced deterministically. |
| Fixture or stale-data artifact | Reconstruct both schedules from the same fresh parsed song. | Only session membership changed. |
| Intended runtime difference | Trace both runtimes to the shared GameSession/index contract. | Both have the same behavior. |
| Duplicate root cause | Compare PH-MUS-001's scoring-state recreation. | Distinct: this is durable source-note identity. |
| Unsupported product condition | Trace loop and hand filtering in the supported practice controls. | The affected session configurations are supported. |

## Calibration

- Actual reach/frequency: fingering edits made while note membership/order differs
  from the full song.
- Recovery and data impact: user-authored fingering is durably misassigned but can
  be manually cleared and re-entered; P2 is proportionate.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: an override must identify one stable source
  note across full, looped, hand-filtered, and track-filtered sessions.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: retain PH-MUS-003 as the canonical durable
  fingering-identity finding.
- Challenger signature/date: Codex (acting), 2026-07-30
