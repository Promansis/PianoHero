# Challenge Record: PH-MUS-001

- Challenger: Codex, fresh isolated fixture; no separate reviewer was available
- Date: 2026-07-11
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P1, high, reproduced

## Claim Under Test

Changing a live session's tempo after a valid hit erases the judged state and makes
the note pending again, corrupting the eventual scored result in both runtimes.

## Independent Reproduction

- Fresh setup/fixture: a new two-note ParsedSong, GameSession, and no renderer,
  audio, database, or stored user data.
- Exact steps: play, hit the first note perfectly at 1,000 ms, then call
  `updateSessionConfig` with only `tempoMultiplier` changed.
- Result and repeat count: one fresh run changed perfect hits/score/judged notes
  from 1/100/1 to 0/0/0 and returned the hit note to `pending`.
- Artifacts: PH-MUS-001 and P3-MUS-001 in the Phase 3 report.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Use pure in-memory GameSession only | Rejected; no host dependency participates |
| Fixture or stale-data artifact | Create a new song/session for the challenge | Rejected; state resets deterministically |
| Intended runtime difference | Trace shared GameScreen tempo handler | Rejected; both runtimes use the same renderer/session path |
| Duplicate root cause | Compare with fingering persistence issue | Rejected; transient score reset differs from durable note identity |
| Unsupported product condition | Use the visible live tempo control's exact update method | Rejected; live tempo change is supported UI behavior |

## Calibration

- Actual reach/frequency: every scored run where a learner changes tempo after a hit.
- Recovery and data impact: no warning or automatic recovery; prior score and
  measure accuracy are lost, and a note may be scored again.
- Music-correctness oracle: changing playback rate must preserve past input in the
  same run.
- Recommended severity/confidence: P1, high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: PH-MUS-001 links WF-009, WF-010, MOD-003, and MOD-011.
- Challenger signature/date: Codex, 2026-07-11.
