# LumaKeys Practice Engine Audit

Use for MIDI parsing, audio scheduling, latency, input, scoring, wait/learning mode,
looping, tempo, fingering, theory correctness, curriculum progression, and the result
handoff from musical behavior to persistence.

## Load First

- Full-audit governance, `PRODUCT.md`, and the current baseline.
- Assigned modules under `src/lib/game`, `midi`, `audio`, `input`, `learning`,
  `theory`, and `piano`.
- Relevant gameplay/theory screens only to trace orchestration and user-visible state.
- Result DTOs and persistence methods only when verifying the session handoff.

## Oracle Before Code

For each rule, write the expected musical or product behavior before evaluating the
implementation. Name the source: MIDI specification/library semantics, score policy,
curriculum definition, theory definition, product requirement, or explicitly agreed
tolerance. A surprising implementation is not a defect without an oracle.

## Deterministic Fixture Set

Build or identify small fixtures that cover:

- Single notes, chords, repeated notes, overlapping same-pitch notes, rests, tempo
  changes, time signatures, multiple tracks/channels, sustain, and boundary timing.
- Exact early/late hit-window edges and just-outside values.
- Loop start/end, note held across loop, pause/resume, tempo changes, and wait mode.
- Multiple simultaneous input sources, disconnect/reconnect, duplicate note-on,
  missing note-off, and latency offsets.
- Left/right hand assignments, custom fingerings, and ambiguous passages.
- Every theory answer class and curriculum prerequisite/completion transition.

Prefer fake/controlled clocks and deterministic audio scheduling assertions. Do not
make wall-clock tests the primary correctness proof.

## Evidence Layers

1. Pure deterministic rule test.
2. Service lifecycle/integration test.
3. Screen-to-session-to-result handoff.
4. Electron and web smoke where runtime behavior differs.
5. Manual MIDI/audio hardware proof using named device/environment.

Hardware evidence supplements deterministic proof; it does not replace it. If no
device is available, mark the coverage row as a hardware evidence gap.

## Measurements

Record sample count, tolerances, median and worst case where relevant. For audio,
canvas, or input latency distinguish scheduled time, callback time, visual time, and
heard/physical time. For performance, define workload and measurement tool before
recording a number.

## Result Integrity

Trace how hits, misses, combo, tempo, duration, measure accuracy, trouble spots,
achievements, practice time, and progression cross the session boundary. Verify that
abandon, retry, pause, loop, and mode differences do not double-count or lose data.

## Exit Gate

Every assigned musical rule has an oracle, deterministic fixture, observed result,
runtime/hardware disposition, and linked finding if needed. Timing claims include
tolerances and repeated measurements. Unverified hardware behavior is never reported
as working or broken.
