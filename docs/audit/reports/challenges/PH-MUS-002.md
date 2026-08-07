# Challenge Record: PH-MUS-002

- Challenger: Codex, fresh isolated fixtures; no separate reviewer was available
- Date: 2026-07-11
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Original severity/confidence/status: P1, high, reproduced

## Claim Under Test

Imported standard MIDI meter/tempo metadata is lost before measure calculations, so
loop and measure-accuracy positions are wrong for non-4/4, tempo-changing, and
exact-bar-ending songs.

## Independent Reproduction

- Fresh setup/fixture: three new in-memory `@tonejs/midi` files with no storage or
  renderer state.
- Exact steps: parse a 3/4 note at measure two, a 120-to-60 BPM 4/4 note at measure
  three, and a one-bar exact-boundary score; compare the parser's tick measure map
  with LumaKeys's public measure functions.
- Result and repeat count: each fresh fixture produced a disagreement; the exact-bar
  fixture exposed a loop `{ startSec: 2, endSec: 2 }`.
- Artifacts: PH-MUS-002 and P3-MUS-002 in the Phase 3 report.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Use parser and utilities in one local process | Rejected; source metadata is retained by the parser |
| Fixture or stale-data artifact | Create three independent MIDI objects | Rejected; each exposes its own deterministic mismatch |
| Intended runtime difference | Trace shared ParsedSong and songUtils code | Rejected; both host runtimes use the same model |
| Duplicate root cause | Compare with backup MIDI-content validation | Rejected; byte identity is unrelated to measure interpretation |
| Unsupported product condition | Use standard 3/4, tempo-change, and 4/4 files | Rejected; all are standard imported MIDI semantics |

## Calibration

- Actual reach/frequency: any imported score outside constant 4/4 or ending exactly on a bar boundary.
- Recovery and data impact: wrong loop target and persisted measure accuracy can misdirect practice; user has no source-aware correction.
- Music-correctness oracle: standard MIDI tempo and meter events define bars.
- Recommended severity/confidence: P1, high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: PH-MUS-002 links WF-004, WF-008, WF-009, DATA-004, DATA-012, and MOD-011.
- Challenger signature/date: Codex, 2026-07-11.
