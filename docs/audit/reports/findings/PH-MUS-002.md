# PH-MUS-002: Imported MIDI Measure Maps Are Replaced By A Fixed 4/4 Grid

- Lane: music correctness
- Severity: P1
- Confidence: high
- Status: accepted
- Owner: remediation owner TBD
- Challenger: Codex, fresh isolated-fixture challenge
- Verifier: independent verifier TBD
- Affected runtime: both
- Coverage rows: WF-004, WF-008, WF-009, DATA-004, DATA-012, MOD-011
- Related/duplicate findings: none
- First observed against: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity

## User Impact

For imported MIDI containing 3/4 or other non-4/4 meter, tempo changes, or a song
ending exactly at a bar boundary, PianoHero assigns note accuracy to the wrong
measure and offers incorrect loop ranges. A one-bar 4/4 song exposes a selectable
second bar with a zero-second loop. Results and trouble-spot recommendations can
therefore direct a learner to the wrong musical section.

## Expected Behavior Or Oracle

Standard MIDI header meter and tempo events determine musical bars. The installed
`@tonejs/midi` parser exposes `header.timeSignatures`, `header.tempos`, ticks, and
`ticksToMeasures`; its parsed notes already use that tempo map for seconds. PianoHero
must preserve or derive an equivalent measure map before presenting bar numbers,
looping by measure, or persisting measure accuracy.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime: Linux x86_64, Node v24.15.0.
- Data profile/fixture: fresh in-memory `@tonejs/midi` files only; no user data.
- Hardware: none.

### Reproduction

1. Create and parse a 120 BPM, 3/4 MIDI file with a note at tick 1440, the first
   beat of measure two.
2. Compare the parser's `ticksToMeasures(1440)` with PianoHero's
   `getMeasureIndexForTime` on the parsed note time.
3. Request loop measure two from PianoHero.
4. Create a 4/4 fixture with 120 BPM at tick zero and 60 BPM from tick 1920, then
   compare the measure of a note at tick 3840.
5. Create one 4/4 bar ending at tick 1920 and request the last selectable loop.

The fixtures printed:

```text
{"expectedMeasureAtNote":1,"pianoHeroMeasureAtNote":0,"pianoHeroLoopMeasure2":{"startSec":2,"endSec":2}}
{"expectedMeasureAtNote":2,"pianoHeroMeasureAtNote":3}
{"durationSec":2,"expectedMeasureCount":1,"pianoHeroMeasureCount":2,"phantomLoop":{"startSec":2,"endSec":2}}
```

### Artifacts

- The parser's local interface omits time signatures, tempo ticks, and measure
  conversion, then retains only the first BPM: `src/lib/midi/midiFileParser.ts:24-32`
  and `src/lib/midi/midiFileParser.ts:83-121`.
- All bar math assumes four beats at that one BPM: `src/lib/game/songUtils.ts:142-173`.
- GameSession uses this value for measure accuracy and loop bounds:
  `src/lib/game/GameSession.ts:243-264` and `src/lib/game/GameSession.ts:298-322`.
- GameScreen exposes the calculated total and loops to users:
  `src/renderer/components/GameScreen.tsx:217-225` and `src/renderer/components/GameScreen.tsx:1176-1190`.
- The existing MIDI parser test proves only a simple constant-tempo, default-meter
  file; the focused Phase 3 suite otherwise passed.

## Root Cause

The app converts a MIDI score into a seconds-only model before preserving its musical
measure metadata. Later code reconstructs bars from `durationSec` and a fixed 4/4
first-tempo grid. It also treats a note ending exactly at a bar boundary as evidence
of a following complete bar.

## Recommended Remediation Boundary

Extend the parsed-song contract with stable tick positions and a canonical measure
map derived from the MIDI header. Build loops, measure counts, scoring buckets,
trouble spots, and result serialization from that map rather than estimating from
seconds. Define the terminal-boundary rule so a song ending on a bar boundary has no
phantom trailing loop. Update parser, game utilities, session/result consumers, and
the affected bridge DTO only if persisted measure numbers require a migration.

## Required Regression Proof

- Deterministic unit/integration proof: 3/4, 6/8, time-signature-change,
  tempo-change, and exact-end-bar fixtures each produce expected measure indices,
  counts, loop ranges, and measure-accuracy buckets.
- Electron proof: import a disposable non-4/4 MIDI file, loop a named measure, and
  verify the rendered/playback start and end match the score.
- Web proof: identical imported bytes produce identical loop and result measure
  numbers in a desktop browser.
- Data/recovery proof: saved measure history/trouble spots use the same measure map
  after reload and backup/restore.
- Manual hardware/UI proof: a musician verifies visible measure labels and loop
  boundaries on a named mixed-tempo/non-4/4 file.
- Broader regression command: `npm test`, `npm run build`, and `npm run build:web`.

## Challenge Record

- Independent reproduction attempt: fresh three fixture families produced the same
  mismatch without storage, renderer timing, or audio involvement.
- Alternative explanations tested: `@tonejs/midi` retained the source tempo and
  time-signature maps, and its own tick conversion produced the expected bar numbers.
  PianoHero's simple MIDI baseline test remains valid for its narrow fixture.
- Scope/severity changes: 3/4, tempo change, and phantom-bar symptoms were merged
  because they share the lost measure-map boundary.
- Deduplication decision: not PH-DATA-003; this is a musical interpretation defect,
  not MIDI-byte identity validation.
- Challenger conclusion and date: accepted by Codex, 2026-07-11; independent
  verifier required before a P1 fix is marked verified.

## Resolution

- Accepted rationale: common supported MIDI metadata produces wrong user-visible practice sections and persisted measure guidance.
- Fix branch/commit/issue: not authorized during discovery.
- Verification evidence: pending remediation.
- Residual risk: learners can be scored and directed against the wrong bar, or select a zero-length loop.
- Revisit trigger: before the next MIDI/gameplay remediation or release readiness review.
