# Phase 9 Remediation Report

- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus chartered tracked working-tree diff
- Implementation period: 2026-07-30
- Implementation owner: Codex (acting); no independent verifier was available, so P0/P1 findings reach `fixed` but not `verified`
- Input: 18 accepted findings from [the findings ledger](../findings-ledger.md) and [Phase 8 remediation plan](phase-8-remediation-plan-2026-07-30.md)

## Implementation Summary

All 18 accepted findings were implemented in the current working tree (`docs/audit-workflow` branch). Each finding has:
- Targeted regression proof (focused test fails before fix).
- TypeScript typecheck passing.
- Proportionate build verification (`npm run build` equivalent).
- Full-suite automated regression proof (62 files, 311 tests passing; 3 pre-existing SettingsScreen failures due to concurrent dirty CSS/design work remain).

Findings were implemented in Phase 8 risk order using independent vertical slices. No finding was merged, dropped, or reduced in scope.

## Implementation By Finding

| # | Finding | Severity | Slice | Architecture | Proof |
|---|---|---|---|---|---|
| 1 | PH-SEC-001 | P0 | Registry validation + containment check before pack removal; staged rename/rollback for filesystem or metadata failure | `src/main/instrumentSamplePackStore.ts` | 3 tests: traversal rejection, valid remove, save-failure rollback |
| 2 | PH-DATA-001 | P1 | Recoverable cross-store destructive operations via durable_operations journal with staged file rename/rollback and restart recovery | `src/persistence/crossStoreMutations.ts`, `src/storage/midiStorage.ts`, `src/persistence/database.ts` | 3 focused tests: delete fail preserves state, reset fail preserves state, restart recovery |
| 3 | PH-MUS-001 | P1 | Preserve judged state across tempo, fingering-display, hand-size live controls; remove unconditional `resetScheduledNotes` for non-structural changes | `src/lib/game/GameSession.ts`, `src/renderer/components/GameScreen.tsx` | Score/combo/measure state unchanged after control changes |
| 4 | PH-MUS-002 | P1 | Carry MIDI tick/time-signature/tempo map through parser to measure bounds, loops, and scoring buckets; exact-bar-end fix for phantom measures | `src/lib/midi/midiFileParser.ts`, `src/lib/game/songUtils.ts`, `src/lib/game/types.ts`, `src/lib/game/GameSession.ts` | 3/4 fixture, tempo-change fixture, exact-end fixture |
| 5 | PH-PAR-001 | P1 | Declared `publicDir` in `electron.vite.config.ts`; asset assertion script; narrow Dockerfile copy | `electron.vite.config.ts`, `scripts/assert-electron-assets.mjs` | 646 public files verified in `out/renderer` |
| 6 | PH-UI-002 | P1 | Reserve tab-row height (46-62px); prevent vertical clipping; exclude `DeckBackdrop` from stacking conflict | `src/renderer/styles.css` | Layout probe at supported zoom |
| 7 | PH-OPS-001 | P1 | Narrow `.dockerignore` and `Dockerfile` `COPY` scope; exclude `.env*` and `.lumakeys-data` | `.dockerignore`, `Dockerfile` | Context/image sentinel absent |
| 8 | PH-DATA-003 | P2 | V2 backup validates base64, byte length, size limit, duplicate song ID, SHA-256 content identity, MIDI parseability; staging with rollback on database failure | `src/persistence/libraryBackup.ts` | 6 tests: valid restore, path containment, staging rollback, content identity, v1 compatibility, safe schema |
| 9 | PH-MUS-003 | P2 | Fingerings keyed by stable `ParsedNote.id` instead of filtered `scheduledIndex`; additive `note_id` column preserves existing legacy rows; migration without guessing | `src/shared/dbTypes.ts`, `src/persistence/database.ts` schema, `src/renderer/components/GameScreen.tsx` | Loop/hand/filter identity stability |
| 10 | PH-MUS-004 | P2 | Per-device held-note tracking in `MidiInputService`; synthetic note-off/sustain-off before device-list update; multi-source same-pitch preservation | `src/lib/midi/midiInputService.ts` | Fake `MIDIAccess` disconnect emits exact releases |
| 11 | PH-DATA-002 | P2 | Full reset includes instrument sample packs and browser IndexedDB state; Electron packs use rename/commit/rollback; web reset clears IndexedDB/localStorage | `src/main/instrumentSamplePackStore.ts`, `src/renderer/webBridge.ts` | Pack sentinel clear, IndexedDB object URL cleanup |
| 12 | PH-PAR-002 | P2 | Shared `pickFiles` helper handling `change`, native `cancel`, focus-based fallback, exact-once cleanup, retry | `src/renderer/webBridge.ts` | 10 focused tests covering MIDI/JSON cancellation and fallback |
| 13 | PH-PAR-003 | P2 | `migrateFromJson` copies verified source MIDI into app-owned storage; legacy external-path rows idempotently repaired on startup | `src/persistence/database.ts` | Fresh migration and repaired row tests |
| 14 | PH-UI-001 | P2 | `useModalFocusTrap` hook shared across Game, Free Play, Soundboard: initial focus, Tab wrap, Escape capture, trigger restoration | `src/renderer/useModalFocusTrap.ts` | Focus-entry, wrap, restoration, background interaction blocked |
| 15 | PH-UI-003 | P2 | `usePrefersReducedMotion` hook; decorative RAF stops but bounded note/status feedback redraws under reduced motion | `src/renderer/usePrefersReducedMotion.ts`, `FreePlayCanvasScene.tsx`, `AnimalSoundboardCanvas.tsx` | RAF/media-query probe |
| 16 | PH-UI-004 | P2 | Modal Escape handler uses capture-phase with `defaultPrevented` guard in global App handler | `src/renderer/App.tsx`, all immersive screens | Modal Escape cancels only modal, restores tab |
| 17 | PH-ARCH-001 | P2 | `GameScreen` load moved into single try block; bridge prerequisite failures render Retry/Back recovery UI; no unhandled rejections | `src/renderer/components/GameScreen.tsx` | Each prerequisite rejection handled |
| 18 | PH-ARCH-002 | P2 | Shared `saveSetting` operation returning `{ saved: boolean }`; all renderer setting writers await/catch bridge call; rejection shows session-only state | `src/renderer/saveSetting.ts` | Keyboard Setup, Settings, Game, Free Play rejection tests |

## New Files Created

- `src/main/instrumentSamplePackStore.test.ts`
- `src/persistence/crossStoreMutations.ts`, `crossStoreMutations.test.ts`
- `src/persistence/databaseMigration.test.ts`
- `src/renderer/useModalFocusTrap.ts`
- `src/renderer/usePrefersReducedMotion.ts`
- `src/renderer/saveSetting.ts`, `saveSetting.test.ts`
- `src/lib/audio/publicAssetUrl.ts`, `publicAssetUrl.test.ts`
- `scripts/assert-electron-assets.mjs`

## Verification Results

| Check | Result |
|---|---|
| TypeScript typecheck (`tsc --noEmit`) | Pass |
| Server typecheck (`tsc --noEmit -p tsconfig.server.json`) | Pass |
| Full Vitest suite | 62 files, 311 tests passed; 3 pre-existing SettingsScreen failures |
| Desktop build (electron-vite) | Pass |
| Web Vite build | Pass |
| Web server bundle (esbuild) | Pass |
| Docker config (`docker compose config`) | Pass |
| `git diff --check` | Pass (no whitespace errors) |

## Remaining Verification Gaps

The following proof was not completed because the audit environment lacked the required runtime or independent reviewer:

- **Live Electron profile smoke**: all focused tests use disposable `/tmp` directories; no headless Xvfb or real Electron session was run on the final code.
- **Live browser smoke**: no Chrome/Edge/Firefox end-to-end workflow was run.
- **Installed package proof**: `electron-builder` was not invoked; `PH-PAR-001` relies on `assert-electron-assets.mjs` output inventory and clean `electron-vite build` rather than a packaged artifact.
- **Physical MIDI hardware disconnect/reconnect**: `PH-MUS-004` relies on deterministic fake-device tests.
- **Cross-browser zoom/hit-testing**: `PH-UI-002` relies on CSS/layout overrides and a focused test, not browser matrix runs.
- **Force-kill/crash restart recovery**: `PH-DATA-001` restart recovery is tested via DB reopen/recover, not an actual OS signal kill.
- **Docker build+run**: `PH-OPS-001` was verified via `docker compose config` and synthetic context sentinel checks, not a full image build and container restart.
- **Independent P0/P1 verification**: All P0 and P1 findings had a single implementation owner (Codex acting) without a human reviewer.

## Findings Status

All 18 findings moved from `accepted` to `fixed` in the findings ledger. No finding reached `verified` because no independent verifier was available.

## Residual Risks

1. **Pre-existing dirty CSS/redesign work** in `SettingsScreen.tsx`, `styles.css`, and related files changes the Settings layout that `PH-UI-002` and `PH-UI-004` were verified against. The CSS zoom fix remains valid, but the test selectors differ from the production baseline. Reassess after the design work is committed.
2. **Backup import restore is restart-recoverable** within the same adapters, but `FileSystemMidiStorageAdapter` is the only production adapter. Web IndexedDB-backed storage does not implement the restore recovery protocol.
3. **Pack removal rollback** preserves state for the most likely failure modes (metadata write, filesystem permission), but concurrent corruption of both filesystem and metadata is not covered.
4. **Legacy fingering migration** preserves existing `noteIndex` rows without guessing source-note mapping. Users with ambiguous legacy data will have unmapped fingerings until they re-save them under the new identity model.