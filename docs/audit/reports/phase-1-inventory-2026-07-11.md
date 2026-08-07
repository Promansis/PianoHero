# Phase 1 Inventory Plan: 2026-07-11

- Lane owner: Codex (acting)
- Reviewer/challenger: independent reviewer pending for any future P0/P1 finding
- Baseline identity: [baseline-2026-07-11.md](baseline-2026-07-11.md)
- Started: 2026-07-11
- Last updated: 2026-07-11
- Status: complete

## Scope

- Coverage rows: WF-001 through WF-024, RT-001 through RT-011, DATA-001 through DATA-016, BR-001 through BR-069, OP-001 through OP-015, and MOD-001 through MOD-012.
- User journeys: all journeys listed in `CONTEXT.md`.
- Runtimes: Electron desktop and self-hosted desktop web.
- Data/privileged boundaries: AppBridge, SQLite, app-owned MIDI/sample storage, browser-local stores, HTTP routes, export/import, deletion, reset, and packaging.
- Explicit exclusions: mobile conditions under ADR 0001.

This report records plans and static inventory evidence only. It does not record
product behavior, dispositions, or findings. The coverage matrix remains the source
of row status.

## Static Inventory Evidence

| Area | Source evidence | Inventory result | Coverage links |
|---|---|---|---|
| Renderer routes | `src/renderer/App.tsx` imports, `AppScreen` union, and render switch | 18 route states and 16 screen components cover setup, keyboard setup, main menu, library, lessons, drills, capstones, game, results, theory, interval, scale, free play, soundboard, progress, and settings. All map to existing workflow rows; no new top-level workflow row was needed. | WF-001..024 |
| App bridge | `src/shared/bridgeMethods.ts` compared mechanically with the matrix | `APP_BRIDGE_METHODS` has 69 methods: 51 RPC, 12 web-special, and 6 web-stub. BR-001..069 has the same 69 names and categories; no missing or extra method was found. | BR-001..069 |
| Durable state | `src/persistence/database.ts` schema; `src/storage/midiStorage.ts`; `src/renderer/webBridge.ts`; renderer localStorage users | Thirteen SQLite tables plus app-owned MIDI/sample files, IndexedDB sample assets, and local preferences map to the existing 16 data rows. | DATA-001..016 |
| Privileged/runtime surface | `src/main/index.ts`, `preload.ts`, `src/renderer/webBridge.ts`, and `src/server/index.ts` | Electron IPC, web bridge dispatch, web API access/bridge/library/MIDI routes, storage, upload/download, and static serving map to the listed operation rows. | OP-001..015 |
| High-risk modules | Existing paths named in the matrix, `packaging/electron-builder.yml`, `Dockerfile`, and `docker-compose.yml` | All 12 listed module/operations surfaces exist and cover the current desktop, web, storage, and deployment surfaces. No size-only conclusion was drawn. | MOD-001..012 |

This is static structural evidence only. Runtime outcomes, failure recovery, security
impact, and user-visible correctness remain untested until their assigned lanes run.

## Evidence Plan

### P1-WF

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| WF-001..024 | Each documented user journey has default, failure/recovery, and destructive-confirmation coverage where applicable. | Map screen entry points to bridge/domain boundaries; later use fresh MIDI and empty-library fixtures. | Both, unless row-specific | Workflow lane report with row links and fixture/recovery notes. |

### P1-RT

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| RT-001..011 | Every supported condition has an explicit test profile or an owner-confirmed gap. | Record window, zoom, DPI, input, motion, and browser/platform matrix before UI evidence. | Electron and web | UI/runtime condition matrix and screenshots outside git. |

### P1-DATA

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| DATA-001..016 | Durable state has create/read/update/delete/reset/backup or an explicit exclusion. | Fresh SQLite and web-local fixtures under `/tmp`; interruption and restart checks. | Both | Runtime-data lane report with before/after integrity evidence. |

### P1-BR

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| BR-001..069 | Every `APP_BRIDGE_METHODS` member has contract, validation, side-effect, category, and user-visible parity proof. | Compare `ipc.ts`, `bridgeMethods.ts`, preload, web bridge, server route, and consumer. | Both | Method-by-method parity table and linked tests. |

### P1-OP

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| OP-001..015 | Privileged and destructive operations contain inputs, side effects, rollback/recovery, and trust-boundary proof. | Isolated files/directories, invalid inputs, size limits, and interruption fixtures. | Row-specific | Runtime-data/security evidence and shared finding IDs where needed. |

### P1-MOD

| Surface | Oracle/invariant | Method/fixture | Runtime | Expected artifact |
|---|---|---|---|---|
| MOD-001..012 | High-risk modules are investigated through user-visible behavior and boundary evidence, never file size alone. | Trace each listed module to its workflows, tests, runtime, and recovery paths. | Row-specific | Module investigation notes linked to workflow/runtime evidence. |

## Downstream Evidence Gaps

| Coverage row | Missing proof | Why blocked | Owner | Next action |
|---|---|---|---|---|
| RT-001, RT-002 | Windows, Edge, and Firefox startup/core-journey evidence | The support policy is confirmed, but only Linux/Chrome has baseline smoke evidence. | Codex (acting) | Run isolated smoke tests on the remaining supported runtime/browser combinations. |
| RT-006, RT-007, RT-011 | Zoom, high-DPI, and MIDI-hardware evidence | The conditions are in scope but no named hardware/display evidence exists yet. | Codex (acting) | Run the UI profile with the available display and MIDI device. |

## Challenge Summary

- Claims disproved or narrowed: the original package-launcher failure was environmental, not a product failure; the Electron/Node ABI mismatch is now guarded by runtime.
- Duplicates merged: all native-module failures map to the repaired environment boundary, not separate product findings.
- Severity changes: none.
- Environmental failures separated: BASE-ENV-001 is resolved; BASE-SEC-001 remains a supply-chain lead and BASE-COND-001 is now an execution-evidence gap.

## Phase 1 Exit Check

- [x] Every required coverage row has a named acting owner and plan reference in the matrix.
- [x] The 18 renderer route states, 16 screen components, 13 SQLite tables, four non-SQL durable-store categories, 69 bridge methods/categories, privileged routes, and 12 high-risk surfaces map to existing rows.
- [x] The desktop support scope is confirmed; product evidence may now begin within it.
- [x] No product findings were created from planning-only work.
- [x] No required row has an empty owner or evidence plan.

## Sign-Off

- Lane owner/date: Codex (acting), 2026-07-11
- Challenger/date: pending
- Audit lead/date: Codex (acting), 2026-07-11
