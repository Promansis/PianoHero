# Phase 8 Remediation Plan

- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered tracked working-tree diff and untracked-source inventory
- Planning date: 2026-07-30
- Audit lead: Codex (acting)
- Input: 18 accepted findings from [the findings ledger](../findings-ledger.md) and [Phase 7 consolidation](consolidation-2026-07-30.md)
- Scope: remediation planning only; no product code, finding status, severity, or coverage disposition changed

## Stage Decision

All 18 accepted findings have one risk-ordered vertical remediation slice. Findings
that already represent several symptoms retain one canonical slice; findings with
different root causes remain separate even when they touch the same files or can
share a verification session.

No implementation owner or branch is assigned by inference. The repository owner
must assign both before a slice enters Phase 9. P0/P1 verification must be performed
by someone other than the implementer when another reviewer is available.

## Execution Order

| Order | Finding | Severity | Slice | Dependency |
|---:|---|---|---|---|
| 1 | PH-SEC-001 | P0 | Contain desktop sample-pack deletion | none; release blocker |
| 2 | PH-DATA-001 | P1 | Recoverable cross-store destructive operations | PH-SEC-001 first where pack deletion is reused |
| 3 | PH-MUS-001 | P1 | Preserve judged state across live controls | none |
| 4 | PH-MUS-002 | P1 | Carry canonical MIDI measure maps end to end | none |
| 5 | PH-PAR-001 | P1 | Package required Electron runtime assets | PH-SEC-001 before managed-pack remove proof |
| 6 | PH-UI-002 | P1 | Keep Settings tabs reachable at supported zoom | none |
| 7 | PH-OPS-001 | P1 | Exclude local data and secrets from Docker images | none |
| 8 | PH-DATA-003 | P2 | Verify backup MIDI content identity | PH-DATA-001 recovery protocol review |
| 9 | PH-MUS-003 | P2 | Persist fingerings by stable source-note identity | PH-MUS-001 state-preservation contract |
| 10 | PH-MUS-004 | P2 | Release notes owned by disconnected MIDI devices | none |
| 11 | PH-DATA-002 | P2 | Include sample packs in full user-data reset | PH-SEC-001 and PH-DATA-001 |
| 12 | PH-PAR-002 | P2 | Settle browser picker cancellation | none |
| 13 | PH-PAR-003 | P2 | Make legacy MIDI migration runtime-neutral | PH-DATA-003 identity/staging rules |
| 14 | PH-UI-001 | P2 | Contain focus in immersive session dialogs | none |
| 15 | PH-UI-003 | P2 | Honor reduced motion in immersive canvases | none |
| 16 | PH-UI-004 | P2 | Stop modal Escape from invoking global Back | none |
| 17 | PH-ARCH-001 | P2 | Settle practice-session prerequisite failures | none |
| 18 | PH-ARCH-002 | P2 | Report durable setting-write outcomes truthfully | none |

Independent slices without a listed dependency may run in parallel after the P0 is
contained. The table defines merge and verification order, not a requirement to keep
one implementation branch open for all work.

## Slice 1: PH-SEC-001

- Accepted finding IDs: PH-SEC-001
- Priority/order: 1, P0
- Implementation owner: security/runtime-data owner TBD
- Verifier: independent security/runtime verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Removing an Electron instrument sample pack can delete only the selected known pack
under the app-owned pack root. Traversal, absolute, malformed, and unknown IDs are
rejected without changing files or installed-pack metadata.

### Boundaries Touched

- Electron adapter: `src/main/instrumentSamplePackStore.ts`, `src/main/index.ts`
- Shared/renderer/web review: `src/shared/ipc.ts`, `src/main/preload.ts`, `src/renderer/webBridge.ts`
- Persistence/storage: installed-pack setting and `instrument-sample-packs` directory

### Scope

- Included: validate against the existing pack registry; derive destinations through
  one containment-aware app-owned path; reject before mutation; inspect
  `file:list-audio` separately and create another finding only if a distinct defect is
  reproduced.
- Excluded: renderer redesign, general IPC refactoring, PH-DATA-002 reset coverage,
  and PH-PAR-001 packaged-asset availability.

### Failure And Data Safety Plan

- Initial durable state: known installed-pack metadata, pack files, and an external
  sentinel in a disposable Electron profile.
- Failure/interruption points: invalid ID, containment rejection, filesystem removal
  failure, and metadata-write failure.
- Cleanup behavior: rejected input performs no filesystem or setting mutation; valid
  removal either removes only the selected pack or reports failure without claiming
  success.
- Backward compatibility: no schema or public result-shape change expected.
- Rollback: never restore unrestricted deletion; disable/reject removal if the safe
  implementation must be rolled back.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | traversal removes external sentinel | invalid IDs preserve all outside paths | isolated main-process store/IPC fixture |
| Boundary/parity proof | Electron trusts renderer ID | Electron registry/containment enforced; web remains scoped | disposable Electron plus IndexedDB review |
| Recovery/integrity proof | mutation can escape root | rejected request leaves files/settings unchanged | before/after inventory |
| Manual UI/hardware proof | not required | not required | n/a |

### Validation

- Narrow commands: focused store/IPC test and existing sample-pack tests
- Affected lane rerun: security and runtime-data sample-pack probes
- Required: `npm test`, `npm run build`, disposable Electron bridge proof

## Slice 2: PH-DATA-001

- Accepted finding IDs: PH-DATA-001
- Priority/order: 2, P1
- Implementation owner: persistence/storage owner TBD
- Verifier: independent data-recovery verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Restore, song deletion, bulk deletion, and full reset either complete across SQLite
and app-owned files or leave an explicit state that restart can deterministically
finish or roll back. An error never silently commits an unrecoverable subset.

### Boundaries Touched

- Persistence/storage: `src/persistence/libraryBackup.ts`,
  `src/persistence/database.ts`, `src/storage/midiStorage.ts`
- Electron adapter: `src/main/index.ts`
- Web adapter/server: `src/server/bridgeRouter.ts`, `src/server/libraryRouter.ts`
- Renderer/UI: library and Settings recovery messaging only where required

### Scope

- Included: restore, single/bulk song deletion, full reset, startup recovery, and one
  narrow cross-store protocol modeled on the existing compensating single-song import.
- Excluded: PH-DATA-002 pack inventory, PH-DATA-003 backup identity validation,
  speculative persistence refactors, and replacing transactions with best-effort
  catches.

### Failure And Data Safety Plan

- Initial durable state: complete rows, MIDI files, folders, playlists, settings, and
  a restorable backup in isolated profiles.
- Failure/interruption points: every staged restore commit, each file deletion, reset,
  database commit, process interruption, and startup recovery.
- Transaction/cleanup: preserve prior records/files until completion or persist a
  durable operation record whose replay/rollback is deterministic.
- Backward compatibility: if a journal/schema is introduced, define old-version and
  downgrade behavior before implementation.
- Rollback: complete or reverse all pending operations before deploying older code;
  never leave an older build unaware of unresolved operation records.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | injected file failure leaves split state | old complete state or recoverable record remains | fake MIDI adapter and disposable DB |
| Boundary/parity proof | Electron/web order DB before files | same recoverable invariant in both hosts | Electron profile and web data root |
| Recovery/integrity proof | restart cannot repair split state | restart plus retry restores declared invariant | before/failure/restart comparison |
| Manual UI/hardware proof | error has no safe recovery path | error offers safe retry/recovery | library and reset flows |

### Validation

- Narrow commands: affected backup, database, bridge, and library-router tests
- Affected lane rerun: persistence, storage, backup/restore, delete, and reset probes
- Required: `npm test`, `npm run build`, `npm run build:web`, both isolated recovery smokes

## Slice 3: PH-MUS-001

- Accepted finding IDs: PH-MUS-001
- Priority/order: 3, P1
- Implementation owner: practice-engine owner TBD
- Verifier: independent music-correctness verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Changing a live non-structural session control preserves prior judgements, score,
combo, measure buckets, active input, and transport position. Any genuinely
structural reset is explicit rather than silent.

### Boundaries Touched

- Domain/practice engine: `src/lib/game/GameSession.ts`, and `ScoringEngine.ts` only
  if state transfer requires it
- Renderer/UI: `src/renderer/components/GameScreen.tsx`, `SessionToolbar.tsx`

### Scope

- Included: classify live controls; preserve state for tempo, metronome, latency
  display, and fingering display; explicitly reset or transfer stable identity for
  controls that change the scheduled set.
- Excluded: PH-MUS-003 durable fingering identity, PH-MUS-004 device cleanup, and a
  general audio-engine redesign.

### Failure And Data Safety Plan

- Initial state: at least one judged note, nonzero score/combo, measure result, active
  input, and known transport time.
- Failure points: each live control and repeated changes during playback.
- Cleanup: no note reopens, duplicates, or disappears from the completed result.
- Backward compatibility: no persistence migration expected.
- Rollback: if preservation regresses, temporarily disable the affected live control
  or require explicit restart confirmation rather than restoring silent resets.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | tempo/control change clears judgement state | all pre-change state remains | deterministic GameSession clock |
| Boundary/parity proof | host UI can produce reset | Electron/web completed fields match | disposable practice run |
| Recovery/integrity proof | note can replay or result changes | one consistent saved result/history | isolated persistence profile |
| Manual UI/hardware proof | visible score resets | score remains with keyboard and named MIDI device | both runtimes where hardware exists |

### Validation

- Narrow commands: `GameSession` and affected `GameScreen` tests
- Affected lane rerun: scoring, transport, controls, and result handoff
- Required: `npm test`, `npm run build`, `npm run build:web`, desktop/web practice smoke

## Slice 4: PH-MUS-002

- Accepted finding IDs: PH-MUS-002
- Priority/order: 4, P1
- Implementation owner: MIDI/practice-engine owner TBD
- Verifier: independent music-correctness verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Imported time-signature and tempo structure determines measure labels, loop bounds,
scoring buckets, history, and trouble spots. Non-4/4 and changing-meter songs are not
replaced by a fixed grid or given a phantom terminal measure.

### Boundaries Touched

- Domain: `src/lib/midi/midiFileParser.ts`, `src/lib/game/types.ts`,
  `src/lib/game/songUtils.ts`, `src/lib/game/GameSession.ts`
- Renderer/UI: loop and measure consumers in `GameScreen.tsx` and results
- Persistence review: measure history/trouble-spot compatibility

### Scope

- Included: canonical note ticks and measure boundaries from MIDI header events;
  exact-bar-end rule; all loop/scoring/history consumers; identical host outcomes.
- Excluded: PH-DATA-003 backup validation, PH-MUS-003 fingering identity, and a
  general parser rewrite.

### Failure And Data Safety Plan

- Initial state: deterministic 3/4, 6/8, meter-change, tempo-change, and exact-end
  fixtures with stated measure oracle.
- Failure points: parse, loop derivation, scoring serialization, reload, and restore.
- Cleanup: no zero-length loops or detached history/trouble spots.
- Backward compatibility: inspect persisted measure-number meaning before deciding
  whether migration is needed; prefer a transient parsed-song change.
- Rollback: code-only if persisted representation is unchanged; otherwise define safe
  read/downgrade behavior before shipping.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | fixtures use fixed 4/4 map | expected indices/counts/bounds pass | deterministic MIDI fixtures |
| Boundary/parity proof | host consumers can diverge | same bytes produce same measures | Electron and web import |
| Recovery/integrity proof | history/trouble spots move | same measures survive reload/restore | isolated library backup |
| Manual UI/hardware proof | labels/loops are musically wrong | musician confirms named score | mixed-meter/tempo score |

### Validation

- Narrow commands: parser, song-utils, GameSession, and result tests
- Affected lane rerun: MIDI parsing, loop, scoring, and result persistence
- Required: `npm test`, `npm run build`, `npm run build:web`, cross-runtime fixture smoke

## Slice 5: PH-PAR-001

- Accepted finding IDs: PH-PAR-001
- Priority/order: 5, P1
- Implementation owner: packaging/runtime-parity owner TBD
- Verifier: independent packaged-runtime verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

A fresh built and packaged Electron app can load curriculum MIDI, soundboard and menu
media, and managed sample-pack manifests/assets from one declared production asset
policy. Missing required assets produce a visible recoverable error.

### Boundaries Touched

- Deployment/packaging: `electron.vite.config.ts`,
  `packaging/electron-builder.yml`, `package.json`, `public/`
- Electron/runtime consumers: `src/main/index.ts`,
  `src/main/instrumentSamplePackStore.ts`, renderer asset URLs
- Web parity review: `vite.web.config.ts`, `src/renderer/webBridge.ts`

### Scope

- Included: one canonical packaged location, output assertions, curriculum,
  representative soundboard/menu assets, and managed-pack install.
- Excluded: source-tree production fallback, PH-SEC-001 deletion containment,
  PH-DATA-002 reset completeness, and unrelated packaging cleanup.

### Failure And Data Safety Plan

- Initial state: clean build/package directories and disposable profile.
- Failure points: renderer build copy, package assembly, runtime URL resolution,
  managed-pack installation, and intentionally missing test asset.
- Cleanup: failed pack install leaves no false installed record.
- Backward compatibility: existing web asset URLs must continue to work.
- Rollback: stop desktop distribution or restore a previously verified artifact; do
  not roll back to source-checkout fallback or known-incomplete output.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | fresh output omits required files | build manifest contains representatives | clean output inventory |
| Boundary/parity proof | Electron paths fail while web works | both use declared policy | built Electron and web |
| Recovery/integrity proof | pack may be reported installed after failure | no misleading record/partial state | missing-asset fixture |
| Manual UI/hardware proof | capstone/media fail in package | capstone starts and media loads | installed/package artifact |

### Validation

- Narrow commands: clean output assertion and asset consumer tests
- Affected lane rerun: runtime parity and packaging asset probes
- Required: `npm test`, `npm run build`, `npm run build:web`, relevant packaging command and package smoke

## Slice 6: PH-UI-002

- Accepted finding IDs: PH-UI-002
- Priority/order: 6, P1
- Implementation owner: renderer UI/accessibility owner TBD
- Verifier: independent UI/accessibility verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Every Settings tab remains visible, pointer reachable, and keyboard operable at the
supported desktop window and 100-200% zoom range in both runtimes.

### Boundaries Touched

- Renderer/UI: `src/renderer/styles.css`, and Settings markup only if CSS cannot meet
  the existing semantic contract
- Tests: `src/renderer/components/SettingsScreen.test.tsx`

### Scope

- Included: reserve actual tab-control height, prevent vertical clipping, retain
  horizontal scrolling only where necessary, and preserve visible focus/hit testing.
- Excluded: mobile layouts, visual redesign, PH-UI-001 focus containment, PH-UI-004
  Escape handling, and stylesheet splitting.

### Failure And Data Safety Plan

- Initial state: supported window sizes and zoom matrix with every Settings tab.
- Failure points: 125%, 150%, 175%, and 200% zoom; pointer and keyboard selection.
- Cleanup: settings values remain stable while switching sections.
- Backward compatibility: CSS-focused, no durable change expected.
- Rollback: revert the layout change and keep release blocked; do not remove required
  zoom support or replace it with a mobile navigation pattern.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | tab centers are clipped/not hit-testable | each center resolves to its tab | deterministic layout probe |
| Boundary/parity proof | required zoom loses sections | Electron and supported browsers pass | desktop zoom matrix |
| Recovery/integrity proof | section switching risks hidden state | values and confirmations remain intact | Settings interaction test |
| Manual UI/hardware proof | Input/Practice inaccessible | all tabs reachable at 200% | keyboard and pointer |

### Validation

- Narrow commands: affected Settings renderer test and layout probe
- Affected lane rerun: zoom, keyboard-only, and Settings workflow matrix
- Required: `npm test`, `npm run build`, `npm run build:web`, Electron/Chrome/Edge/Firefox proof

## Slice 7: PH-OPS-001

- Accepted finding IDs: PH-OPS-001
- Priority/order: 7, P1
- Implementation owner: operations/deployment owner TBD
- Verifier: independent image/build-context verifier required
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Docker build context, image layers, and final application image contain application
inputs only, never checkout-local PianoHero data, browser/audit profiles, or `.env`
secrets. Runtime persistence remains under mounted `/data`.

### Boundaries Touched

- Deployment: `.dockerignore`, `.gitignore`, `Dockerfile`, `docker-compose.yml`
- Web runtime review: `src/server/index.ts`

### Scope

- Included: exclude data roots and `.env*`; prefer narrow Docker copy inputs; assert
  synthetic sentinels are absent from context and final image; verify `/data` restart.
- Excluded: real user data in tests, web access control, BASE-SEC-001/Hono body-limit
  work, PH-PAR-001 Electron assets, and a container-platform redesign.

### Failure And Data Safety Plan

- Initial state: synthetic local data and secret sentinels only.
- Failure points: context assembly, broad copy, cached layers, final image, and restart.
- Cleanup: no checkout data under `/app`; only mounted `/data` persists.
- Backward compatibility: deployment inputs remain explicit.
- Rollback: never restore broad inclusion; add only a missing required build input or
  halt publication. Embedded real secrets require separate image/cache revocation.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | sentinels enter context/image | all sentinels absent | synthetic checkout fixture |
| Boundary/parity proof | image owns checkout data | runtime uses mounted `/data` only | disposable Compose stack |
| Recovery/integrity proof | state location is ambiguous | `/data` survives restart; `/app` stays clean | container restart |
| Manual UI/hardware proof | not applicable | not applicable | n/a |

### Validation

- Narrow commands: `docker compose config` and no-cache context/image assertion
- Affected lane rerun: Docker confidentiality and runtime-data-location probes
- Required: `npm test`, `npm run build:web`, isolated container startup/restart

## Slice 8: PH-DATA-003

- Accepted finding IDs: PH-DATA-003
- Priority/order: 8, P2
- Implementation owner: persistence/backup owner TBD
- Verifier: data-integrity verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

A v2 backup is accepted only when each embedded MIDI payload safely decodes, fits the
existing size boundary, has the declared name/length, and hashes to its song ID. A
rejected backup identifies the affected song and leaves all durable state unchanged.

### Boundaries Touched

- Persistence: `src/persistence/libraryBackup.ts`
- Existing identity rule: `src/lib/midi/importMetadata.ts`
- Host boundaries/tests: library router and web bridge; Library UI only if error text
  lacks a recoverable identifier

### Scope

- Included: strict base64, filename, length, size, safe ID, and SHA-256 validation
  before staging; valid v2 and explicit metadata-only v1 behavior.
- Excluded: signatures/encryption, backup merge redesign, v1 removal, and
  PH-DATA-001 post-mutation recovery.

### Failure And Data Safety Plan

- Initial state: existing library plus valid and tampered backup fixtures.
- Failure points: decode, size, name, length, hash, and staging boundary.
- Cleanup: invalid input creates no row, final MIDI, or staging residue.
- Backward compatibility: valid v2 remains valid; v1 policy remains explicit.
- Rollback: code-only; rejected backups create no state. Do not weaken v2 identity to
  accept malformed input.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | substituted same-length bytes import | hash/name/base64/size failures reject | backup fixtures |
| Boundary/parity proof | adapters may surface different outcome | both reject before mutation | Electron selection/web upload |
| Recovery/integrity proof | invalid backup may stage/mutate | rows/files/staging unchanged; valid retry works | before/after inventory |
| Manual UI/hardware proof | error may be opaque | affected song and retry path visible | backup import UI |

### Validation

- Narrow commands: backup and library-router tests
- Affected lane rerun: backup validation and no-mutation probes
- Required: `npm test`, `npm run build`, `npm run build:web`

## Slice 9: PH-MUS-003

- Accepted finding IDs: PH-MUS-003
- Priority/order: 9, P2
- Implementation owner: practice-engine/persistence owner TBD
- Verifier: music-correctness verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

A custom fingering saved for a visible note remains attached to the same source-song
note after changing loop, hand, ignored tracks, display order, runtime, or reload.

### Boundaries Touched

- Domain: parsed, scheduled, and visible note identity in `src/lib/game/*` and parser
- Renderer: `GameScreen.tsx` fingering editor flow
- Shared/host contracts: `dbTypes.ts`, `ipc.ts`, preload, main, web bridge/server
- Persistence/backup: database fingering key and library backup round trip

### Scope

- Included: prove and choose one stable source-note key; carry it end to end; define
  additive migration or safe interpretation for existing integer `noteIndex` rows.
- Excluded: fingering-generation redesign, PH-MUS-001 scoring reset, and track UI
  redesign.

### Failure And Data Safety Plan

- Initial state: repeated/simultaneous notes and saved legacy/current fingerings.
- Failure points: loop/hand/track filtering, reload, bridge writes, migration, restore.
- Cleanup: ambiguous legacy values never silently attach to another note.
- Backward compatibility: retain enough legacy representation for rollback; do not
  destructively guess mappings.
- Rollback: revert readers/writers while preserving additive migrated data for a
  corrected forward release.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | filtered index moves override | same source note receives override | full/loop/hand/track fixtures |
| Boundary/parity proof | host persistence may differ | Electron/web reload same mapping | bridge/database fixture |
| Recovery/integrity proof | migration can misbind legacy data | documented safe legacy outcome; backup round trip | disposable legacy DB |
| Manual UI/hardware proof | edit moves after reopening | edit/reset/reopen behaves consistently | both runtimes |

### Validation

- Narrow commands: GameSession, GameScreen, database, bridge, and backup tests
- Affected lane rerun: fingering and result-state probes
- Required: `npm test`, `npm run build`, `npm run build:web`

## Slice 10: PH-MUS-004

- Accepted finding IDs: PH-MUS-004
- Priority/order: 10, P2
- Implementation owner: MIDI/input owner TBD
- Verifier: verifier with named MIDI hardware TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

When a MIDI input disconnects, every note owned by that device is released before the
device list update. Another device or computer keyboard holding the same pitch remains
active, and reconnect does not leave stuck visual, audio, or session state.

### Boundaries Touched

- Domain/input: `src/lib/midi/midiInputService.ts`
- Downstream only if tests require: `GameSession.ts`, `heldNotes.ts`, `GameScreen.tsx`

### Scope

- Included: source ownership, one synthetic Note Off per held pitch, event order,
  duplicate/reconnect handling, same-pitch multi-source behavior, and sustain proof.
- Excluded: permission UX, latency calibration, audio-engine replacement, and device
  picker redesign.

### Failure And Data Safety Plan

- Initial state: fake access with one/multiple sources, held pitches, and sustain.
- Failure points: source removal, duplicate state changes, reconnect, and second
  disconnect.
- Cleanup: removed-source state clears exactly once without clearing other owners.
- Backward compatibility: no durable migration.
- Rollback: reinitialize the MIDI service and clear active notes; retain the
  deterministic regression as a release guard.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | Note On plus disconnect emits no release | exact releases precede device list | fake `MIDIAccess` |
| Boundary/parity proof | host lifecycle may leave held state | Electron/browser behavior matches | named device |
| Recovery/integrity proof | stuck input/audio or false result remains | reconnect is clean; other source preserved | session fixture |
| Manual UI/hardware proof | physical unplug remains unverified | named hardware repeat passes | recorded OS/runtime/device |

### Validation

- Narrow commands: new MIDI service test plus affected held-note/session tests
- Affected lane rerun: MIDI permission/select/disconnect/reconnect lifecycle
- Required: `npm test`, `npm run build`, `npm run build:web`, physical hardware proof

## Slice 11: PH-DATA-002

- Accepted finding IDs: PH-DATA-002
- Priority/order: 11, P2
- Implementation owner: persistence/runtime-data owner TBD
- Verifier: reset/recovery verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Full user-data reset does not report success until SQLite, app-owned MIDI, Electron
sample packs, browser local storage, and browser IndexedDB pack records are cleared.
Partial failure is reported truthfully and can be retried.

### Boundaries Touched

- Electron: main reset and sample-pack store
- Web: server reset, `webBridge.ts` IndexedDB/localStorage cleanup
- Persistence/storage: database and MIDI reset
- Renderer: Settings completion/error state; shared contract only if a richer result
  is necessary

### Scope

- Included: complete durable-store inventory, app-owned pack-root removal, IndexedDB
  deletion/object URL cleanup, truthful completion, and retry from partial state.
- Excluded: normal per-pack removal, installation changes, learning-only reset, and
  restoration of intentionally deleted data.

### Failure And Data Safety Plan

- Initial state: data in every listed store.
- Failure points: each store cleanup and UI completion callback.
- Cleanup: any failed secondary step prevents all-clear success; retry is idempotent.
- Backward compatibility: retain bridge shape unless richer outcome is required.
- Rollback: never restore deleted privacy-reset data; retain partial-failure messaging
  rather than reverting to false success.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | pack sentinels survive reset | every listed store clears | Electron/web fixtures |
| Boundary/parity proof | reset boundary differs by host | both report complete boundary | disposable profiles |
| Recovery/integrity proof | secondary failure still looks successful | partial failure visible; retry completes | injected store failure |
| Manual UI/hardware proof | installed pack remains | status becomes not installed after reset | Settings reset flow |

### Validation

- Narrow commands: Settings, bridge, database, and webBridge reset tests
- Affected lane rerun: full reset inventory and recovery probes
- Required: `npm test`, `npm run build`, `npm run build:web`, both runtime reset smokes

## Slice 12: PH-PAR-002

- Accepted finding IDs: PH-PAR-002
- Priority/order: 12, P2
- Implementation owner: web adapter/runtime-parity owner TBD
- Verifier: independent browser verifier recommended
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Canceling browser MIDI import, reattach, or backup import settles with the existing
empty/`null` contract, removes temporary picker state, clears loading/progress, and
allows immediate retry without upload or durable mutation.

### Boundaries Touched

- Web adapter: `src/renderer/webBridge.ts`
- Renderer callers: `LibraryScreen.tsx`
- Shared contract: unchanged result shapes

### Scope

- Included: one browser picker helper handling success, `cancel`, failure, and a
  documented fallback for browsers lacking `cancel`; exact once cleanup/settlement.
- Excluded: server import redesign, File System Access API adoption, drag/drop,
  progress redesign, and Electron dialog changes.

### Failure And Data Safety Plan

- Initial state: clean page with no picker/input/listener residue.
- Failure points: explicit cancel, fallback cancel, error, double events, immediate
  second attempt.
- Cleanup: remove hidden input/listeners once and perform no fetch/mutation.
- Backward compatibility: preserve all public result shapes.
- Rollback: code-only; no durable state. Keep cancellation regression tests.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | cancel promise remains pending | each method settles correct shape | DOM picker fixture |
| Boundary/parity proof | web differs from Electron cancellation | user-visible outcome aligns | supported browsers |
| Recovery/integrity proof | loading/input/listener may remain | no fetch/mutation; immediate retry works | LibraryScreen fixture |
| Manual UI/hardware proof | cancel blocks workflow | cancel/retry passes in Chrome/Edge/Firefox | browser matrix |

### Validation

- Narrow commands: webBridge and LibraryScreen tests
- Affected lane rerun: import/reattach/restore cancellation matrix
- Required: `npm test`, `npm run build:web`, supported-browser smoke

## Slice 13: PH-PAR-003

- Accepted finding IDs: PH-PAR-003
- Priority/order: 13, P2
- Implementation owner: persistence migration/runtime-parity owner TBD
- Verifier: independent migration verifier recommended
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

A supported legacy `song-metadata.json` row has the same outcome in Electron and web:
verified app-owned MIDI or an explicit unavailable state with reattach. Electron no
longer silently makes it playable through an external-path fallback unavailable to
web.

### Boundaries Touched

- Persistence/migration: `src/persistence/database.ts`, import/staging/storage
- Electron: legacy load/recompute fallback in `src/main/index.ts`
- Web: MIDI and bridge routers
- Shared/renderer: unavailable state and Library recovery only if required

### Scope

- Included: select one documented verified-copy or explicit-unavailable policy; fresh
  and already-migrated profiles; valid/missing/unreadable/hash-mismatch cases; load,
  recompute, reattach, interruption, and migration marker timing.
- Excluded: arbitrary external web paths, PH-DATA-001 general atomicity,
  PH-DATA-003 backup entry point, and removal of reattach.

### Failure And Data Safety Plan

- Initial state: fresh and already-migrated legacy fixtures with all source cases.
- Failure points: source verification, staging, database update, marker rename, load,
  recompute, and interruption.
- Cleanup: no half final file or falsely completed marker; original external file is
  never deleted; retry provenance remains.
- Backward compatibility: prefer additive explicit state; previous builds must still
  open the database where feasible.
- Rollback: rows remain app-owned/playable or explicitly recoverable; do not restore
  silent Electron-only fallback as the long-term state.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | migrated row loads only in Electron | canonical state independent of host | legacy fixtures |
| Boundary/parity proof | load/recompute diverge | both hosts agree against same data root | Electron then web |
| Recovery/integrity proof | interrupted migration can become ambiguous | original/provenance retained; reattach works | fault injection/restart |
| Manual UI/hardware proof | user cannot distinguish missing MIDI | unavailable state and reattach are clear | Library workflow |

### Validation

- Narrow commands: persistence, MIDI-router, bridge, and LibraryScreen tests
- Affected lane rerun: migration/load/recompute/reattach parity
- Required: `npm test`, `npm run build`, `npm run build:web`, shared-data-root smoke

## Slice 14: PH-UI-001

- Accepted finding IDs: PH-UI-001
- Priority/order: 14, P2
- Implementation owner: renderer UI/accessibility owner TBD
- Verifier: independent keyboard-accessibility verifier recommended
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Opening a Game, Free Play, or Soundboard session menu moves focus inside it; Tab and
Shift+Tab remain contained; Resume/Escape restores the invoking control; background
controls are not focusable while the modal is open.

### Boundaries Touched

- Renderer: the three immersive screens and one existing/reusable focus pattern
- Tests: corresponding screen interaction tests

### Scope

- Included: initial focus, wrap, background inertness, Escape, focus restoration, and
  existing exit/discard policy.
- Excluded: PH-UI-004 global Settings Escape, gameplay state, navigation redesign,
  and unrelated dialogs.

### Failure And Data Safety Plan

- Initial state: active session and focused menu trigger.
- Failure points: open, forward/reverse tab, Resume, Escape, and Main Menu.
- Cleanup: Resume preserves session; Main Menu keeps existing explicit policy.
- Backward compatibility: no durable state.
- Rollback: revert primitive/adoption; no data repair.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | Tab reaches background | focus wraps in each dialog | Testing Library |
| Boundary/parity proof | runtime keyboard behavior may vary | Electron and browsers pass | keyboard-only smoke |
| Recovery/integrity proof | focus/session return is undefined | focus restored; session preserved | active session fixture |
| Manual UI/hardware proof | keyboard user cannot contain navigation | Resume/Main Menu reachable | desktop keyboard |

### Validation

- Narrow commands: Game, Free Play, and Soundboard screen tests
- Affected lane rerun: immersive modal keyboard matrix
- Required: `npm test`, `npm run build`, `npm run build:web`, Electron/browser proof

## Slice 15: PH-UI-003

- Accepted finding IDs: PH-UI-003
- Priority/order: 15, P2
- Implementation owner: renderer UI owner TBD
- Verifier: reduced-motion verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

With reduced motion enabled, Free Play and Soundboard stop perpetual decorative
canvas animation while direct note/status feedback remains understandable.

### Boundaries Touched

- Renderer: reduced-motion detection and `FreePlayCanvasScene.tsx`,
  `AnimalSoundboardCanvas.tsx`

### Scope

- Included: shared preference subscription, pause decorative loops, bounded redraws
  for essential feedback, and runtime preference changes.
- Excluded: general performance work, visual redesign, saved settings, and removal of
  essential feedback.

### Failure And Data Safety Plan

- Initial state: idle and active canvases under default/reduced motion.
- Failure points: mount, preference change, note event, unmount.
- Cleanup: no perpetual reduced-motion loop or leaked subscription/RAF.
- Backward compatibility: no durable state.
- Rollback: code-only; restores prior animation behavior.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | reduced motion schedules perpetual RAF | idle loop stops; note redraw is bounded | mocked RAF/media query |
| Boundary/parity proof | canvases ignore host preference | both runtimes/browsers honor it | pixel/RAF probe |
| Recovery/integrity proof | preference switch may alter feature state | recording/backing/settings unchanged | screen fixture |
| Manual UI/hardware proof | feedback may disappear | keyboard/MIDI feedback remains usable | reduced-motion runtime |

### Validation

- Narrow commands: affected canvas/screen tests
- Affected lane rerun: reduced-motion and canvas cleanup probes
- Required: `npm test`, `npm run build`, `npm run build:web`, runtime pixel/RAF proof

## Slice 16: PH-UI-004

- Accepted finding IDs: PH-UI-004
- Priority/order: 16, P2
- Implementation owner: renderer navigation/UI owner TBD
- Verifier: keyboard-accessibility verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Escape in a Settings destructive confirmation cancels only the confirmation, restores
its trigger, and leaves the same Settings tab open. Escape outside a modal retains the
documented contextual Back behavior.

### Boundaries Touched

- Renderer: `src/renderer/App.tsx`, `SettingsScreen.tsx`

### Scope

- Included: make global Escape dispatch honor an already-handled modal event; cover
  learning and full-data confirmations plus non-modal Settings Back.
- Excluded: PH-UI-001 focus containment, reset implementation, wording, and navigation
  redesign.

### Failure And Data Safety Plan

- Initial state: open destructive confirmation on a known tab.
- Failure points: Escape in modal and Escape without modal.
- Cleanup: modal cancel invokes no bridge mutation or unrelated save.
- Backward compatibility: no durable state.
- Rollback: code-only; destructive action remains unaccepted on the Escape path.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | Escape closes modal and exits Settings | only modal closes; trigger restored | App/Settings tests |
| Boundary/parity proof | host event behavior may differ | both runtimes and browsers match | keyboard smoke |
| Recovery/integrity proof | cancel can navigate/save/reset | no bridge mutation; same tab remains | mocked bridge |
| Manual UI/hardware proof | keyboard cancel loses context | user continues on same tab | keyboard-only |

### Validation

- Narrow commands: App and Settings tests
- Affected lane rerun: confirmation and contextual navigation matrix
- Required: `npm test`, `npm run build`, `npm run build:web`, runtime keyboard proof

## Slice 17: PH-ARCH-001

- Accepted finding IDs: PH-ARCH-001
- Priority/order: 17, P2
- Implementation owner: renderer practice-lifecycle owner TBD
- Verifier: practice recovery verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Starting practice always settles as a mounted session or a visible recoverable error.
Rejected settings, stats, fingering, or MIDI reads cannot leave an infinite loading
message or unhandled promise rejection.

### Boundaries Touched

- Renderer: `src/renderer/components/GameScreen.tsx`
- Host boundaries: mocked/rejected AppBridge calls; no contract change expected

### Scope

- Included: one renderer-owned prerequisite load operation, loading/error state,
  `getSetting`, `getUserStats`, `getCustomFingerings`, MIDI load, Retry/Back.
- Excluded: scoring, PH-MUS-003 identity, MIDI parsing, focus containment, bridge
  schema, and unrelated practice defects.

### Failure And Data Safety Plan

- Initial state: selected song with each prerequisite independently rejectable.
- Failure points: every preflight call and MIDI/session mount.
- Cleanup: no result, fingering, assignment, or practice-time mutation after failure;
  Retry/Back settles all pending state.
- Backward compatibility: no durable change.
- Rollback: code-only; failing preflight performs no durable write.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | rejected prerequisite stays loading | readable recoverable error appears | GameScreen mocked bridge |
| Boundary/parity proof | Electron/web failures may surface differently | same renderer outcome | forced IPC/RPC failures |
| Recovery/integrity proof | pending/unhandled state remains | no mutation; Retry/Back succeeds | disposable profiles |
| Manual UI/hardware proof | error not keyboard escapable | readable and keyboard escapable | practice start flow |

### Validation

- Narrow commands: GameScreen failure-path tests
- Affected lane rerun: practice prerequisite loading/failure/retry matrix
- Required: `npm test`, `npm run build`, `npm run build:web`, forced-failure smokes

## Slice 18: PH-ARCH-002

- Accepted finding IDs: PH-ARCH-002
- Priority/order: 18, P2
- Implementation owner: renderer settings owner TBD
- Verifier: durable-setting outcome verifier TBD
- Branch/worktree: dedicated Phase 9 implementation branch TBD

### User-Visible Outcome

Keyboard bind, clear, reset, input mode, and representative in-session setting writes
remain immediately usable but are not reported as durably saved until `setSetting`
resolves. Rejection is visible as session-only or retryable and creates no unhandled
promise rejection.

### Boundaries Touched

- Renderer: `KeyboardSetupScreen.tsx`, `SettingsScreen.tsx`, `App.tsx`, and direct
  writers in Game/Free Play
- AppBridge/persistence: existing `setSetting` contract and behavior, unchanged

### Scope

- Included: one result-owning renderer setting operation/policy; bind, clear, reset,
  input mode, and representative direct writers; durable versus session-only result.
- Excluded: database semantics, schema, PH-DATA-001 transactions, and unrelated
  renderer operations.

### Failure And Data Safety Plan

- Initial state: known saved mapping and forced `setSetting` success/failure.
- Failure points: bind, clear, reset, mode, and representative Game/Free Play writes.
- Cleanup: immediate input behavior may continue, but durable claim waits; restart
  read-back distinguishes saved from session-only state.
- Backward compatibility: no bridge/schema migration expected.
- Rollback: code-only; never fabricate persistence for a rejected write.

### Test-First Proof

| Proof | Fails before fix | Expected after fix | Runtime/fixture |
|---|---|---|---|
| Targeted regression | rejected write still reports success | truthful session-only/retry state | renderer tests |
| Boundary/parity proof | IPC/RPC failures differ in UI | same outcome in both runtimes | forced bridge rejection |
| Recovery/integrity proof | restart contradicts success message | read-back matches durable claim | disposable profiles |
| Manual UI/hardware proof | remapping feedback is misleading | keyboard-only mapping remains usable/truthful | Settings/setup flow |

### Validation

- Narrow commands: Keyboard Setup, Settings, App, Game, and Free Play tests
- Affected lane rerun: renderer setting-write ownership/failure matrix
- Required: `npm test`, `npm run build`, `npm run build:web`, forced-write-failure smokes

## Shared Verification Opportunities

- PH-SEC-001 and PH-PAR-001 may share packaged managed-pack verification, but remain
  separate security and packaging findings.
- PH-DATA-001 and PH-DATA-002 may share reset fault injection after the cross-store
  protocol exists, but retain separate atomicity and store-inventory acceptance.
- PH-DATA-003 and PH-PAR-003 should reuse content-ID, staging, and corrupt/missing MIDI
  fixtures; backup restore and legacy migration remain separate entry points.
- PH-MUS-001 and PH-MUS-002 may share completed-result integrity proof, but their
  session-state and measure-map implementations remain separate.
- PH-UI-001 and PH-UI-003 may share immersive-screen runtime sessions, but focus and
  reduced-motion verification remain independent.

## Phase 9 Start Gate

Before implementation begins for a slice:

- Assign the implementation owner, verifier, and dedicated branch/worktree.
- Reproduce the finding with the smallest failing check.
- Confirm the baseline has not changed or record a new source identity.
- Use only isolated data under `/tmp` or a disposable Electron profile.
- Keep unrelated cleanup and unaccepted leads, including BASE-SEC-001, outside the
  slice unless separately accepted.
- Do not move a finding to `verified` until its targeted regression, runtime,
  recovery/integrity, and required manual/hardware proof are complete.

## Phase 8 Completion

- Accepted findings planned: 18 of 18.
- P0/P1 blockers planned: 7 of 7.
- P2 findings planned: 11 of 11.
- Findings merged or dropped: 0.
- Product changes made: 0.
- Remaining gate: repository owner assigns Phase 9 owners, verifiers, and branches.
