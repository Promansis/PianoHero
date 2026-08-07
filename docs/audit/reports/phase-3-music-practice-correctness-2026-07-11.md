# Phase 3: Music And Practice Correctness - 2026-07-11

- Lane owner: Codex (acting)
- Reviewer/challenger: Codex fresh-fixture challenge; independent verifier pending for P1 remediation
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Started: 2026-07-11
- Last updated: 2026-07-11
- Status: complete with four accepted findings and explicit hardware, audio, and policy evidence gaps

## Scope

- Coverage rows: WF-002 through WF-004, WF-008 through WF-015, RT-011,
  DATA-004, DATA-005, DATA-007, DATA-010, DATA-012, MOD-003, and MOD-011.
- User journeys: MIDI and computer-keyboard input, song parsing and practice,
  scoring, looping, timing, fingering, learning drills/capstones, theory, scale
  practice, audio playback, results, and progress handoff.
- Runtimes: runtime-independent deterministic rules, renderer service composition,
  and source-level Electron/web shared paths. Method-by-method runtime parity is
  reserved for Phase 4.
- Data boundaries: game and theory result DTOs, custom fingerings,
  measure-accuracy history, trouble spots, user statistics, and practice-day time.
- Explicit exclusions: mobile, production/personal data, implementation fixes,
  and hardware assertions without a named device and repeatable measurement.

## Evidence Plan

| Surface | Oracle/invariant | Method/fixture | Runtime | Artifact |
|---|---|---|---|---|
| MIDI parsing and bar positions | Imported standard MIDI tempo and meter metadata must determine measure numbers and loop boundaries. | `@tonejs/midi` 3/4, tempo-change, and exact-bar fixtures. | shared | P3-MUS-002 |
| Scoring and transport | Exact timing thresholds, combo state, wait mode, repeated notes, hand filters, and tempo controls preserve the intended session state. | Focused GameSession/ScoringEngine tests and fresh session probes. | shared | P3-MUS-001 |
| Input lifecycle | Keyboard/MIDI events normalize to distinct physical sources; disconnect must release source-held notes. | Existing input tests plus fake Web MIDI access disconnect fixture. | browser/Electron renderer | P3-MUS-004 |
| Fingering | A saved override identifies the same song note regardless of loop, hand filter, or view ordering. | Fresh full-song and looped-session fixture. | shared | P3-MUS-003 |
| Learning and theory | Generated drills, curriculum gating, interval/chord/key/scale rules, and theory result handoff use deterministic answer oracles. | Focused unit/component tests and source trace. | shared | focused test run |
| Result handoff | Score, measure accuracy, mode, tempo, and practice duration have a defined, single persistence meaning. | ResultsScreen/database trace and short-end seek probe. | shared | P3-GAP-003 |
| Audio and latency | Scheduled, callback, visual, and heard/physical time are separately measured. | Source trace; named-device measurement deferred. | renderer/hardware | P3-GAP-001 |

## Working Flows Confirmed

| Coverage row | Evidence | Conditions/limits | Disposition |
|---|---|---|---|
| WF-003 | `computerKeyboardInputService.test.ts` covers normal input, repeat suppression, octave clamp, blur release, velocity, and retrigger behavior; `heldNotes.test.ts` and `GameScreen.test.tsx` cover first-source/last-source audio behavior. | Desktop keyboard UI and Electron/web parity remain later-lane proof. | deterministic input normalization covered |
| WF-004 | `midiFileParser.test.ts` proves baseline BPM, track, note, and default hand extraction; `importMetadata.test.ts` covers metadata/difficulty calculation. | This positive path only covers constant-tempo/default-meter material. | covered with PH-MUS-002 for general meter/tempo correctness |
| WF-008 | `songUtils.test.ts`, `drillGenerator.test.ts`, and GameSession fixtures prove assignment, filtering, and scheduled notes are scoreable. | Track-selection UI and runtime parity remain later evidence. | covered with PH-MUS-003 for persisted fingering identity |
| WF-009 | `ScoringEngine.test.ts` proves symmetric perfect/good/ok/miss boundaries at 25/50/100 ms, combo behavior, accuracy, and final totals. `GameSession.test.ts` proves misses, repeated notes, wait mode, multi-source holds, and display modes. | No physical audio/input latency measurement was available. | covered with PH-MUS-001 and PH-MUS-004; P3-GAP-001/002 remain |
| WF-010 | `ResultsScreen.test.tsx` proves results do not persist temporary MIDI runs. The results screen forwards game fields once to `saveGameResult`; database persistence records score, measure history, and practice-day updates transactionally. | The duration field's actual-time versus source-length meaning is unspecified. | result handoff covered except P3-GAP-003 |
| WF-011 | `drillGenerator.test.ts` verifies white-key patterns, parallel hand tracks, monotonic times, GameSession scoring, and rhythm-clapping events. `curriculum.test.ts` verifies unique lessons, populated steps, tier order, capstone gating, and unlock thresholds. | Full screen interaction belongs to the UI lane. | deterministic curriculum/progression covered |
| WF-012 through WF-014 | `chords.test.ts`, `intervals.test.ts`, `keyDetection.test.ts`, and `scales.test.ts` cover current pure theory answer rules; theory/interval/scale screens trace their completed sessions through `saveTheoryResult`. | Browser interaction and audible-question proof are later UI/hardware work. | deterministic answer rules covered |
| WF-015 | `AudioEngine` schedules source note times scaled by requested tempo, and live input only starts/stops audio on first/last source. | No WebAudio callback trace, heard-onset measurement, backing-track synchronization, or export waveform proof was collected. | explicit P3-GAP-001 |

## MIDI Parsing And Measure Oracles

`@tonejs/midi` preserves `header.tempos`, `header.timeSignatures`, ticks, and a
`ticksToMeasures` conversion for parsed standard MIDI data. PianoHero's
`ParsedSong` retains only one BPM and seconds-only notes, then derives every bar
from a fixed 4/4 first-tempo grid.

The fresh fixtures produced the following output:

```text
3/4 fixture:
{"expectedMeasureAtNote":1,"pianoHeroMeasureAtNote":0,"pianoHeroLoopMeasure2":{"startSec":2,"endSec":2}}

4/4 fixture with a 120 -> 60 BPM change:
{"expectedMeasureAtNote":2,"pianoHeroMeasureAtNote":3}

One 4/4 bar ending exactly on its boundary:
{"durationSec":2,"expectedMeasureCount":1,"pianoHeroMeasureCount":2,"phantomLoop":{"startSec":2,"endSec":2}}
```

These fixtures are the evidence for PH-MUS-002. Base parsing remains correct for
the simple MIDI fixture used by the existing test suite.

## Scoring, Transport, And Input

The focused Phase 3 command passed all 18 selected files and 76 tests:

```text
npm test -- src/lib/game/GameSession.test.ts src/lib/game/ScoringEngine.test.ts src/lib/game/songUtils.test.ts src/lib/game/fingeringAlgorithm.test.ts src/lib/midi/midiFileParser.test.ts src/lib/midi/importMetadata.test.ts src/lib/input/computerKeyboardInputService.test.ts src/lib/input/heldNotes.test.ts src/lib/learning/curriculum.test.ts src/lib/learning/drillGenerator.test.ts src/lib/learning/learningProgress.test.ts src/lib/learning/developerUnlocks.test.ts src/lib/theory/chords.test.ts src/lib/theory/intervals.test.ts src/lib/theory/keyDetection.test.ts src/lib/theory/scales.test.ts src/renderer/components/GameScreen.test.tsx src/renderer/components/ResultsScreen.test.tsx

18 files passed, 76 tests passed
```

The tests did not cover live tempo reconfiguration. A fresh GameSession scored one
perfect hit, changed only `tempoMultiplier`, and returned:

```text
{"before":{"perfect":1,"total":100,"judged":1},"after":{"perfect":0,"total":0,"judged":0},"resetNoteJudgement":"pending"}
```

This is PH-MUS-001. The score reset also reopens the previously judged note.

Post-record validation also passed without changing production source:

```text
npm run typecheck
passed

npm test
57 files passed, 285 tests passed
```

For disconnect handling, a fake Web MIDI access emitted one Note On, removed the
device, and dispatched `statechange`. The production service reported zero devices
but emitted no matching Note Off:

```text
{"events":["noteon:60"],"deviceCountAfterDisconnect":0}
```

This is PH-MUS-004.

## Fingering

A saved override uses `scheduledIndex`, which is recomputed after loop and hand
filters. A fixture that saved index zero while looping the second bar applied the
same record to the first note in the full song:

```text
{"loopSession":[{"id":"loop-note","scheduledIndex":0,"finger":5}],"fullSession":[{"id":"first","scheduledIndex":0,"finger":5},{"id":"loop-note","scheduledIndex":1,"finger":1}]}
```

This is PH-MUS-003. Existing algorithm tests continue to prove valid generated
finger assignments for the current visible schedule.

## Learning, Theory, And Result Handoff

- Lesson progress safely round-trips through settings and falls back from malformed
  JSON. Sequential gating requires both prior lessons and capstone accuracy.
- Generated drills and rhythm-clapping drills produce deterministic, scoreable
  note schedules.
- Theory pure functions correctly identify the currently supported simple/compound
  intervals, chord templates, key signatures, and scale sequences under their test
  fixtures.
- Theory, interval, and scale screen completion paths each call `saveTheoryResult`.
- ResultsScreen forwards `GameResult` exactly once for a persisted library song;
  temporary MIDI runs deliberately do not persist.

## Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-MUS-001](findings/PH-MUS-001.md) | Live tempo and session-control changes discard judged practice state. | Workflows, progress |
| [PH-MUS-002](findings/PH-MUS-002.md) | MIDI meter/tempo semantics and exact-bar boundaries produce wrong loops and measure accuracy. | MIDI import, progress, runtime parity |
| [PH-MUS-003](findings/PH-MUS-003.md) | Custom fingering persistence targets a filtered-session index rather than a stable song note. | Persistence, workflows, runtime parity |
| [PH-MUS-004](findings/PH-MUS-004.md) | MIDI disconnect leaves source-held notes active. | Workflows, UI, runtime parity |

## Evidence Gaps

| Coverage row | Missing proof | Why blocked | Owner | Next action |
|---|---|---|---|---|
| RT-011, WF-002 | Named MIDI hardware permission/select/disconnect/reconnect proof in Electron and supported browsers. | No named device, driver, and repeatable hardware environment were available. | Runtime/UI lane owner | Test a named device on Linux/Windows and Chrome/Edge/Firefox where Web MIDI is supported; record connection, repeat count, and cleanup result. |
| WF-009, WF-015, MOD-011 | Audio schedule, callback, visual, and heard-onset latency measurements. | No safe physical audio loopback/measurement rig was available; AudioEngine has no deterministic schedule test. | Practice/audio remediation owner | Add controlled audio scheduling tests and perform named-device loopback measurements before final readiness. |
| WF-009 | Duplicate MIDI Note On policy. A same-source duplicate Note On scores a later same-pitch target without a Note Off. | No product policy distinguishes a duplicate from an intended retrigger; this is not classified as a finding without that oracle. | Product/audit lead | Define the policy and add a GameSession regression fixture for duplicate and missing Note Off events. |
| WF-010, DATA-010 | `GameResult.durationSec` meaning. Seeking to the final 0.2 seconds of a 600-second song reports `recordedDurationSec:600`, which the database adds to total practice time. | Product documentation does not state whether this field represents source length, active play time, or wall-clock session time. | Product/audit lead | Decide the metric contract, then classify or accept the behavior and add a pause/seek/tempo regression test. |
| BR-013 through BR-034, BR-059 through BR-060 | Electron/web return, error, and cancellation parity for practice/result/fingering/MIDI methods. | Explicit Phase 4 scope. | Runtime parity lane owner | Perform method-by-method parity testing. |

## Runtime And Failure Coverage

- Electron: shared renderer logic and baseline startup evidence apply; no named MIDI hardware or physical audio proof was collected.
- Web: fake Web MIDI lifecycle covers the browser service statechange behavior; no real browser/device permission flow was collected.
- Loading/empty/disabled: GameScreen and ResultsScreen focused tests cover selected empty/mocked paths; full screen-state coverage is Phase 5.
- Error/retry/recovery: MIDI parse/import errors and temporary-result non-persistence are covered by focused tests; reconnect recovery is PH-MUS-004.
- Destructive/interruption: no destructive action was used. All probes were pure in-memory fixtures.
- Accessibility or hardware proof: keyboard UI, physical audio, and MIDI hardware evidence remain explicit gaps.

## Challenge Summary

- Claims disproved or narrowed: baseline parser behavior for simple constant-tempo MIDI, scoring boundaries, wait mode, generated drills, and pure theory rules passed their existing deterministic tests.
- Duplicates merged: 3/4, tempo-change, and exact-boundary loop failures share PH-MUS-002's missing MIDI measure-map boundary.
- Severity changes: PH-MUS-001 and PH-MUS-002 are P1 because they corrupt core practice scoring or core loop/trouble-spot guidance on supported workflows. PH-MUS-003 and PH-MUS-004 are recoverable P2 defects.
- Environmental failures separated: no environmental failure affected the focused suite or in-memory probes. Hardware/audible latency remains an evidence gap, not a product conclusion.

## Lane Exit Check

- [x] Every assigned musical rule has a stated oracle, deterministic fixture, observed result, and disposition or explicit gap.
- [x] All findings link to detailed reports and coverage rows.
- [x] P0/P1 leads were challenged with fresh fixtures; independent verifier is required before remediation is marked verified.
- [x] Positive/working behavior is recorded.
- [x] Manual and hardware gaps are explicit.
- [x] Coverage matrix and ledger references are updated.

## Sign-Off

- Lane owner/date: Codex (acting), 2026-07-11
- Challenger/date: Codex fresh-fixture challenge, 2026-07-11; independent P1 verifier pending for any fix
- Audit lead/date: Codex (acting), 2026-07-11
