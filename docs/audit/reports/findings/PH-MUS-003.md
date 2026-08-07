# PH-MUS-003: Custom Fingerings Bind To A Filtered Session Index

- Lane: music correctness
- Severity: P2
- Confidence: high
- Status: accepted
- Owner: remediation owner TBD
- Challenger: Codex, fresh isolated-fixture challenge
- Verifier: verifier TBD
- Affected runtime: both
- Coverage rows: WF-008, WF-009, DATA-007, BR-032, BR-033, BR-034, MOD-003, MOD-011
- Related/duplicate findings: none
- First observed against: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity

## User Impact

When a learner edits a fingering while a loop or hand filter is active, the saved
override is assigned to the visible schedule position, not the underlying song note.
Opening the full song later can display the chosen finger on a different note and
leave the originally edited note with an algorithmic finger. The user is shown
incorrect technique guidance after saving a valid edit.

## Expected Behavior Or Oracle

A durable fingering override must identify the same musical note in the source song
regardless of a current loop, hand filter, ignored track, or display ordering. The
database stores `noteIndex`, but its value must be a stable source identity rather
than an index after a transient session filter.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime: Linux x86_64, Node v24.15.0.
- Data profile/fixture: in-memory two-note ParsedSong and FingeringRow only; no user data.
- Hardware: none.

### Reproduction

1. Create a two-bar song with one right-hand note in each bar.
2. Start a learning session looped to bar two, where the bar-two note has
   `scheduledIndex` zero.
3. Persist a custom right-hand fifth-finger override at index zero, as the editor
   does for the selected visible note.
4. Open a full-song session with that same persisted record.

The fresh probe printed:

```text
{"loopSession":[{"id":"loop-note","scheduledIndex":0,"finger":5}],"fullSession":[{"id":"first","scheduledIndex":0,"finger":5},{"id":"loop-note","scheduledIndex":1,"finger":1}]}
```

### Artifacts

- GameSession filters to loop bounds before assigning indexes and looking up
  overrides: `src/lib/game/GameSession.ts:243-264`.
- The visible note exposes that transient `scheduledIndex`:
  `src/lib/game/GameSession.ts:349-391`.
- GameScreen copies `scheduledIndex` into the editor and database payload:
  `src/renderer/components/GameScreen.tsx:1125-1161`.
- `FingeringRow` and the SQLite key are only `(songId, noteIndex)`:
  `src/shared/dbTypes.ts:39-44` and `src/persistence/database.ts:450-468`.

## Root Cause

Persistence uses an index from `scheduledNotes`, a derived list whose membership and
order change when a session loops, filters hands, or ignores a track. There is no
stable source-note identifier or source-order index at the persistence boundary.

## Recommended Remediation Boundary

Store a stable parsed-note identity or canonical source-order index. Carry that
identity into `ScheduledNote` and `VisibleNote`, use it in editor callbacks and the
bridge/database key, and provide a migration/legacy interpretation for existing
integer records. Ensure looped, filtered, and full sessions resolve the same saved
override without recreating the score state.

## Required Regression Proof

- Deterministic unit/integration proof: save a fingering in full, looped,
  left-only, right-only, and ignored-track sessions; each reload applies it only to
  the original source note.
- Electron proof: edit a fingering in a loop, reopen the full song in a disposable
  profile, and verify the label is on the intended note.
- Web proof: repeat through the web bridge and verify the returned row maps to the
  same note.
- Data/recovery proof: legacy records retain a documented mapping or report a safe
  migration outcome; backup/restore retains stable overrides.
- Manual hardware/UI proof: a learner can edit, save, reset, and re-open a fingering
  while loop and hand controls vary.
- Broader regression command: `npm test`, `npm run build`, and `npm run build:web`.

## Challenge Record

- Independent reproduction attempt: a fresh two-note, two-bar fixture reproduced
  the remapping without renderer, storage, or audio state.
- Alternative explanations tested: the different finger is not a heuristic change;
  the same persisted index deterministically resolves to a different note.
- Scope/severity changes: none.
- Deduplication decision: separate from PH-MUS-001 because this is durable note
  identity, not score-state reset.
- Challenger conclusion and date: accepted by Codex, 2026-07-11.

## Resolution

- Accepted rationale: persisted user-authored technique data points to the wrong musical event after a supported view change.
- Fix branch/commit/issue: not authorized during discovery.
- Verification evidence: pending remediation.
- Residual risk: saved fingerings can actively teach the wrong fingering until reset or manual correction.
- Revisit trigger: before fingering persistence or loop-practice changes ship.
