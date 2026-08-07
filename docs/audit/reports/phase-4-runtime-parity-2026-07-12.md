# Phase 4: Runtime Parity - 2026-07-12

- Lane owner: Codex (acting)
- Reviewer/challenger: Codex fresh isolated-runtime challenge; independent verifier remains required before a P1 remediation is marked verified
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Started: 2026-07-12
- Last updated: 2026-07-12
- Status: complete with three accepted runtime-parity findings and explicit platform/package evidence gaps

## Scope

- Coverage rows: BR-001 through BR-069; runtime-special paths for MIDI, backup, browser file selection, sample packs, and desktop-only file capabilities.
- User journeys: import, reattach, practice loading, capstones, free-play export, sample packs, backup import/export, and legacy-library recovery.
- Runtimes: Electron 30.5.1 on Linux x64 and Chrome 149.0.7827.114 against isolated data roots under `/tmp`.
- Data/privileged boundaries: `AppBridge`, preload IPC, web RPC, MIDI/library routes, browser IndexedDB, and Electron renderer/package output.
- Explicit exclusions: mobile, production data, fixes, named MIDI hardware, physical audio latency, Windows/Edge/Firefox manual execution, and package publication.

## Evidence Plan

| Surface | Oracle/invariant | Method/fixture | Runtime | Artifact |
|---|---|---|---|---|
| Shared RPC methods | Valid typed renderer calls produce the same `AppDatabase` outcome and DTO; web-only malformed-request validation is deliberate. | Contract/category test, bridge-router tests, direct adapter trace. | both | P4-RPC |
| Browser picker paths | Selecting and cancelling a picker must settle to the documented result shape and clear UI work. | Controlled Chrome file-input cancellation probe. | web | PH-PAR-002 |
| Legacy MIDI rows | A song created by the supported JSON migration must either load/recompute in both runtimes or have an explicit recovery state. | Fresh `song-metadata.json`, external valid MIDI, Electron then web against the same disposable data root. | both | PH-PAR-003 |
| Packaged public assets | Electron production output must contain every renderer asset required by the bridge and user-visible flows. | Fresh `npm run build`, output inventory, Electron curriculum load, web comparison. | both | PH-PAR-001 |
| Intentional desktop-only capabilities | Browser stubs must be hidden or explicitly explained by the consuming UI. | Renderer source/test trace for library, game, free-play, and settings controls. | both | P4-UI-GATES |

## Working Flows Confirmed

| Coverage row | Evidence | Conditions/limits | Disposition |
|---|---|---|---|
| RPC method set: BR-002 through BR-007, BR-011, and BR-013 through BR-056 | `AppBridge` inventory partitions all 69 methods exactly once; preload maps the RPC methods to IPC handlers, `webBridge` posts them to `createBridgeRouter`, and the router validator is type-complete. Seven focused adapter/UI suites passed 69 tests. | Invalid web transport bodies intentionally receive HTTP 400/404 before database dispatch; Electron's trusted renderer transport exposes database/IPC errors instead. | covered for valid renderer calls; inherited findings remain linked in the matrix |
| BR-001, BR-009, BR-061 through BR-065 | Browser stubs return `null` or an empty list. GameScreen, LibraryScreen, FreePlayScreen, and SettingsScreen hide the corresponding desktop-only controls or give an explicit desktop-only message. | Browser-specific export/download product work remains a later product decision; the current UI does not falsely offer these actions. | intentional capability difference covered |
| BR-008, BR-010, BR-012, BR-057 through BR-059 | MIDI upload, reattach, progress, backup import/export, and app-owned MIDI reads have compatible normal paths through local dialogs versus browser upload/download and HTTP routes. Router, MIDI, library, and web-bridge tests passed. | Browser cancellation does not settle three picker-backed methods; migrated legacy MIDI reads diverge. | covered with PH-PAR-002 and PH-PAR-003 |
| BR-066, BR-068, BR-069 | Both runtimes expose status, removal, and resolved source DTOs for their own sample-pack stores. Shared status construction keeps the visible DTO shape aligned. | Existing PH-SEC-001 and PH-DATA-002 remain the canonical storage findings. | covered with inherited findings |

## Method-by-Method Disposition

| Coverage IDs and methods | Electron outcome | Web outcome and disposition |
|---|---|---|
| BR-001 `pickMidiFile` | Native file dialog returns `PickedMidiFile` or `null`. | Stub returns `null`; GameScreen hides the temporary-MIDI picker in web. Intentional exception covered. |
| BR-002 through BR-007 `getAllSongs`, `getSong`, `addSong`, `updateSong`, `deleteSong`, `toggleFavorite` | IPC invokes the same database/storage operations. | Valid RPC calls reach the same database operations. Web request validation is intentionally stricter; `deleteSong` remains subject to PH-DATA-001. Covered. |
| BR-008 `importMidiFiles` | Native multi-file dialog returns per-file imports, errors, and skips; progress events are emitted. | Browser input uploads files sequentially and emits equivalent progress/result data. Picker cancellation is PH-PAR-002. |
| BR-009 `importMidiFolder` | Native directory dialog imports recursively or returns `null`. | Stub returns `null`; LibraryScreen does not render Import Folder on web. Intentional exception covered. |
| BR-010 `reattachMidiFile` | Native file dialog returns `ReattachMidiResult`; unknown song rejects before the dialog. | Browser upload returns the same normal result shape. Picker cancellation is PH-PAR-002; a migrated source row is PH-PAR-003. |
| BR-011 `recomputeAllSongDifficulties` | Uses app-owned MIDI first, then Electron's legacy external-file fallback. | Uses app-owned MIDI only. A migrated row recomputes in Electron and reports a missing-file error on web: PH-PAR-003. |
| BR-012 `onImportProgress` | IPC event subscription returns an unsubscribe function. | In-process listener set returns an unsubscribe function and receives upload-loop events. The completion path is blocked by PH-PAR-002 on picker cancellation. |
| BR-013 through BR-018 `saveGameResult`, `getGameResults`, `getUserStats`, `saveTheoryResult`, `getTheoryResults`, `getTheoryStats` | IPC reaches matching `AppDatabase` methods and DTOs. | Valid RPC reaches the same methods/DTOs; schema validation rejects malformed HTTP input. Covered. |
| BR-019 through BR-021 `getPracticeDays`, `recordPracticeTime`, `getPracticeStreak` | IPC reaches matching practice methods. | Valid RPC reaches matching methods and return shapes. Covered. |
| BR-022 through BR-026 `getAllAchievements`, `unlockAchievement`, `getTroubleSpots`, `updateTroubleSpot`, `getMeasureAccuracyHistory` | IPC reaches matching achievement/trouble-spot methods. | Valid RPC reaches matching methods and return shapes. Covered. |
| BR-027 through BR-031 `getRecommendations`, `getProgressStats`, `getProgressTopSongs`, `getAllUnresolvedTroubleSpots`, `getLibrarySnapshot` | IPC returns database-derived aggregate DTOs. | Valid RPC returns the same database-derived DTOs. Covered. |
| BR-032 through BR-034 `getCustomFingerings`, `saveCustomFingering`, `clearCustomFingerings` | IPC reaches matching fingering methods. | Valid RPC reaches matching methods. PH-MUS-003 remains the canonical note-identity defect. |
| BR-035 through BR-039 `getAllFolders`, `createFolder`, `renameFolder`, `deleteFolder`, `moveSongToFolder` | IPC reaches matching folder methods. | Valid RPC reaches matching methods; web rejects an unknown destination folder before dispatch. Covered. |
| BR-040 through BR-047 `getAllPlaylists`, `createPlaylist`, `updatePlaylist`, `deletePlaylist`, `getPlaylistSongs`, `addSongToPlaylist`, `removeSongFromPlaylist`, `reorderPlaylistSong` | IPC reaches matching playlist methods. | Valid RPC reaches matching methods and DTOs. Covered. |
| BR-048 through BR-052 `bulkDeleteSongs`, `bulkMoveSongsToFolder`, `bulkAddTag`, `bulkRemoveTag`, `bulkAddToPlaylist` | IPC reaches matching database/storage operations. | Valid RPC reaches matching operations. `bulkDeleteSongs` inherits PH-DATA-001. |
| BR-053 through BR-056 `getSetting`, `setSetting`, `resetLearningProgress`, `resetUserData` | IPC reaches matching settings/reset methods. | Valid RPC reaches matching settings/reset methods. `resetUserData` inherits PH-DATA-001 and PH-DATA-002. |
| BR-057 `exportLibrary` | Save dialog returns `null` on cancel or a `target: 'file'` result. | Browser download returns a `target: 'download'` result. The target DTO deliberately explains the capability difference. Covered. |
| BR-058 `importLibrary` | Native JSON dialog returns `null` on cancel, otherwise imports through the shared backup code. | Browser JSON picker/upload reaches the same backup import code. Picker cancellation is PH-PAR-002; inherited atomicity/content checks remain PH-DATA-001 and PH-DATA-003. |
| BR-059 `loadMidiFileData` | Reads app-owned MIDI, then a migrated legacy `filePath` fallback. | HTTP route reads app-owned MIDI only. The reproduced legacy mismatch is PH-PAR-003. |
| BR-060 `loadCurriculumMidi` | Reads `out/renderer/curriculum-midis/<name>` in production output. | Fetches a copied public asset successfully. Fresh Electron output lacks the directory: PH-PAR-001. |
| BR-061 and BR-062 `saveMidiFile`, `saveWavFile` | Native save dialogs write bytes and return path or `null`. | Stubs return `null`; FreePlayScreen hides export controls in web. Intentional exception covered. |
| BR-063 `pickAudioFile` | Native audio-file dialog returns path/name or `null`. | Stub returns `null`; FreePlayScreen hides backing-track loading in web. Intentional exception covered. |
| BR-064 `pickSampleDirectory` | Native directory dialog returns path or `null`. | Stub returns `null`; SettingsScreen shows an explicit desktop-only custom-folder notice. Intentional exception covered. |
| BR-065 `listAudioFiles` | Lists supported extensions in a chosen directory. | Returns `[]`; all consumer calls are guarded by `!IS_WEB`. Intentional exception covered. |
| BR-066 `getInstrumentSamplePackStatuses` | Builds status from the desktop settings/file store. | Builds the same status DTO from IndexedDB. Store location is intentionally runtime-specific. Covered. |
| BR-067 `installInstrumentSamplePack` | Installs a managed bundled pack or a selected manual directory. | Fetches a managed manifest/assets into IndexedDB. Electron package output omits the managed assets: PH-PAR-001. |
| BR-068 `removeInstrumentSamplePack` | Removes desktop settings/files. | Removes IndexedDB record/object URLs. Existing PH-SEC-001 and PH-DATA-002 remain canonical. |
| BR-069 `resolveInstrumentSampleSource` | Returns desktop file URLs/base URL or `null`. | Returns cached object URLs/base `null` or `null`. Both satisfy the shared source DTO. Covered. |

## Isolated Runtime Evidence

### P4-PAR-001: Fresh Electron Build Asset Check

`npm run build` passed, but emitted unresolved public-asset warnings for the main-menu background. The newly generated `out/renderer` contained only `assets/` and `index.html`; it did not contain `curriculum-midis/`, `soundboard/`, or the public main-menu asset. A real Electron renderer invocation of `loadCurriculumMidi('ode-to-joy.mid')` returned:

```text
{"ok":false,"message":"Error invoking remote method 'file:load-curriculum-midi': Error: ENOENT: no such file or directory, open '/media/storage/LumaKeys/out/renderer/curriculum-midis/ode-to-joy.mid'"}
```

The same web build returned the bytes:

```text
{"ok":true,"length":614,"firstByte":77}
```

### P4-PAR-002: Browser Picker Cancellation

In Chrome 149, a controlled live-web probe replaced the temporary input's `click` with a `cancel` event and waited 150 ms. `webBridge.importMidiFiles()` remained pending:

```text
{"cancelDispatched":true,"settled":false}
```

Both `pickMidiFiles` and `pickJsonFile` register only `onchange`; neither handles cancellation or cleans up the hidden input. Electron's corresponding dialogs return the documented empty or `null` result immediately when cancelled.

### P4-PAR-003: Supported Legacy JSON Migration

A fresh `/tmp` user-data root contained only a valid external MIDI file and the supported `song-metadata.json` migration input. Electron migrated the row, loaded its bytes through the desktop fallback, and recomputed its metadata:

```text
{"ok":true,"songCount":1,"filePath":"/tmp/lumakeys-audit-p4-migration-ljNQo5/legacy-source.mid","byteLength":614}
{"ok":true,"updated":1,"errors":0}
```

Using the same data root, web RPC listed the migrated song but its MIDI route and recompute path read only the missing app-owned file:

```text
HTTP/1.1 404 Not Found
{"error":"ENOENT: no such file or directory, open '/tmp/lumakeys-audit-p4-migration-ljNQo5/midi-files/legacy-migrated-song.mid'"}

{"result":{"updated":0,"errors":[{"filename":"Migrated legacy song","message":"ENOENT: no such file or directory, open '/tmp/lumakeys-audit-p4-migration-ljNQo5/midi-files/legacy-migrated-song.mid'"}]}}
```

## Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-PAR-001](findings/PH-PAR-001.md) | Electron build and package inputs omit public runtime assets required by curriculum MIDI and managed sample packs. | Workflows, operations, packaging |
| [PH-PAR-002](findings/PH-PAR-002.md) | Browser file-picker cancellation does not return the bridge contract's cancellation result. | Workflows, UI |
| [PH-PAR-003](findings/PH-PAR-003.md) | Supported migrated song rows have incompatible byte-loading and difficulty-recompute outcomes. | Persistence, workflows |

## Evidence Gaps

| Coverage row | Missing proof | Why blocked | Owner | Next action |
|---|---|---|---|---|
| RT-001, RT-002 | Full Windows, Edge, and Firefox runtime smoke. | Only Linux Electron and Chrome were available in this audit environment. | Runtime/UI lane owner | Execute the phase-5 desktop profile on the remaining supported platform/browser combinations. |
| MOD-012, BR-067 | Actual package artifact install/run after remediation. | Discovery did not authorize packaging or publication; fresh production output and packaging descriptors establish the current root cause. | Remediation verifier | Run `npm run package:local` and an installed-artifact curriculum/sample-pack smoke after a fix. |
| RT-011 | Named hardware MIDI permission/disconnect/reconnect evidence. | No device and multi-platform driver environment was available. | Runtime/UI lane owner | Follow the existing Phase 3 hardware plan. |

## Runtime And Failure Coverage

- Electron: real isolated renderer probes exercised preload IPC for legacy song bytes, recompute, and curriculum assets. The local test launch used `--no-sandbox` because this environment's Electron sandbox helper is not configured; this is not a product runtime conclusion.
- Web: isolated Node server plus Chrome exercised the MIDI route, RPC recompute, copied curriculum asset, and browser picker proxy behavior.
- Loading/empty/disabled: renderer tests cover normal library, settings, and free-play capability gates. Capstone asset failure is silent outside the console and is PH-PAR-001.
- Error/retry/recovery: PH-PAR-002 leaves browser import actions pending; PH-PAR-003 can be recovered by reattaching MIDI but has no explicit migrated-file state.
- Destructive/interruption: Phase 2 canonical findings PH-DATA-001 through PH-DATA-003 and PH-SEC-001 remain linked rather than duplicated.
- Accessibility or hardware proof: desktop focus/zoom/motion and named MIDI evidence remain Phase 5/RT-011 work.

## Challenge Summary

- Claims disproved or narrowed: all valid RPC methods share a complete contract/category inventory and reach the same database owner. Desktop-only filesystem actions are intentionally gated from the browser UI rather than silently exposed.
- Duplicates merged: delete/reset/restore, sample-pack reset/removal, and fingering identity retain their existing PH-DATA, PH-SEC, and PH-MUS canonical IDs.
- Severity changes: PH-PAR-001 is P1 because every Electron capstone is unavailable in fresh production output; PH-PAR-002 and PH-PAR-003 are recoverable P2 defects.
- Environmental failures separated: Electron's local Node ABI switch and sandbox-helper configuration were handled by the existing native-module guard and `--no-sandbox` test flag. Neither is a product finding.

## Lane Exit Check

- [x] All 69 AppBridge rows have an owner, evidence reference, and disposition in the coverage matrix.
- [x] Every runtime-special and web-stub path has a documented UI/capability story.
- [x] All new findings link to detailed reports, challenges, and affected coverage rows.
- [x] The P1 package finding was challenged with a fresh build and real Electron/web probes; independent verification remains required for any remediation.
- [x] Positive shared-RPC behavior and intentional differences are recorded.
- [x] Remaining browser/platform/hardware/package checks are explicit.
- [x] Coverage summary counts are updated.

## Sign-Off

- Lane owner/date: Codex (acting), 2026-07-12
- Challenger/date: Codex fresh isolated-runtime challenge, 2026-07-12; independent P1 remediation verifier pending
- Audit lead/date: Codex (acting), 2026-07-12
