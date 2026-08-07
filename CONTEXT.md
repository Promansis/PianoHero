# PianoHero Context

## Purpose

This document defines the stable language and system boundaries used when planning,
auditing, and changing PianoHero. `PRODUCT.md` defines the product intent and
`DESIGN.md` defines the visual system. Architecture decisions belong in
`docs/adr/`.

## Product Boundary

PianoHero is a single-user piano-learning application for beginner and
intermediate players. It supports two host runtimes:

- Electron desktop.
- A desktop-browser web runtime backed by Node, Hono, SQLite, and app-owned files.

Mobile is not a supported runtime or viewport. Mobile responsiveness, touch-first
navigation, and mobile performance are not acceptance criteria. UI validation
instead covers the supported minimum desktop window, the default 1480x960 layout,
larger desktop windows, 125-200% zoom, high-DPI output, keyboard-only operation,
reduced motion, canvas visibility, and MIDI-device workflows.

## Domain Language

- **Song**: imported MIDI metadata plus an app-owned reference to the MIDI bytes.
- **Library**: songs, folders, playlists, tags, song goals, custom fingerings, and
  the operations used to organize or back them up.
- **Practice session**: a configured gameplay run for a song, lesson, drill, or
  capstone.
- **Theory session**: a quiz, interval-trainer, or scale-practice run whose result
  may be persisted.
- **Practice engine**: deterministic gameplay, MIDI interpretation, scoring,
  timing, looping, waiting, fingering, input normalization, and audio scheduling.
- **App bridge**: the typed `window.appBridge` contract shared by renderer code and
  the Electron/web runtime implementations.
- **Runtime adapter**: host-specific implementation of bridge, storage, file,
  upload/download, and privileged behavior.
- **Persistence**: SQLite-backed structured state owned by `AppDatabase` in
  `src/persistence/database.ts`.
- **Storage**: app-owned MIDI and sample bytes plus the path-containment and file
  lifecycle rules around them.
- **Finding**: one evidence-backed defect or risk tracked in
  `docs/audit/findings-ledger.md`.
- **Disposition**: the current decision for a coverage item or finding, including
  accepted risk, remediation, or evidence that no gap was found.

## User Journeys

The audit inventory starts with these journeys and expands only when evidence shows
another user-visible workflow:

1. First-run setup and MIDI/keyboard configuration.
2. Song import, reattachment, organization, editing, and deletion.
3. Song practice, track assignment, gameplay, results, retry, and next-song flow.
4. Lessons, generated drills, curriculum capstones, and learning progression.
5. Theory quiz, interval training, and scale practice.
6. Free play, recording, backing audio, and MIDI/WAV export.
7. Novelty soundboard play.
8. Progress, recommendations, achievements, goals, and trouble spots.
9. Settings, latency calibration, sample packs, and input/audio preferences.
10. Library backup/restore, learning reset, and full user-data reset.

## Current Ownership

| Concern | Current owner |
|---|---|
| Product and visual acceptance | `PRODUCT.md`, `DESIGN.md` |
| App shell and route orchestration | `src/renderer/App.tsx` |
| Screen presentation and local interaction | `src/renderer/components/*` |
| Deterministic domain logic | `src/lib/*` |
| Shared bridge and persisted DTO contracts | `src/shared/*` |
| Electron host behavior | `src/main/*` |
| Browser bridge behavior | `src/renderer/webBridge.ts` |
| Web host behavior | `src/server/*` |
| Structured persistence | `src/persistence/*` |
| App-owned MIDI storage | `src/storage/*` |
| Audit governance and current ledgers | `docs/audit/*` |
| Historical architecture investigation | `.codex-audits/codebase/*` |

Historical audit artifacts are leads, not current findings. Reproduce and cite their
claims before entering them into the live findings ledger.

## Dependency Direction

```text
renderer screens -> renderer services -> domain modules
                 -> window.appBridge -> runtime adapter

runtime adapters -> shared contracts -> persistence/storage
domain modules   -> shared plain-data types where needed
```

Renderer code must not import Electron, server, SQLite, or privileged filesystem
implementations. Domain modules must remain testable without a host runtime.
Runtime-specific differences must be explicit in bridge categories or UI gating.

## Durable State

SQLite currently owns songs, user stats, game results, theory results, settings,
fingerings, folders, playlists, playlist membership, practice days, achievements,
trouble spots, and measure-accuracy history. MIDI files and instrument samples also
have a durable lifecycle outside SQLite. Browser-local state and IndexedDB-backed
sample assets must be included when tracing reset, backup, restore, and parity.

No audit or test may use the owner's production database or data directory. Runtime
proof must use an isolated absolute directory under `/tmp` through
`PIANOHERO_DATA_DIR` or the equivalent Electron test profile.

## Quality Priorities

In order of risk:

1. No user-data loss, arbitrary file access, or unsafe privileged operations.
2. Musically correct timing, input, scoring, progression, and theory behavior.
3. Equivalent user outcomes across supported runtimes, with explicit exceptions.
4. Readable, operable practice UI while the user's hands are occupied.
5. Recoverable errors, reproducible builds, and diagnosable operations.
6. Clear ownership and testable module boundaries based on observed behavior.

## Change Policy

Discovery is read-only. Findings do not authorize fixes. Accepted findings become
small vertical remediation slices with their own regression proof. Large files are
investigation targets, not automatic refactor targets. Architecture changes require
an ADR when they alter ownership, dependency direction, persistence, runtime support,
or a public contract.
