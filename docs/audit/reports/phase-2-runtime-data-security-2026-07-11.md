# Phase 2 Runtime, Data Safety, And Security Audit: 2026-07-11

- Lane owner: Codex, acting
- Reviewer/challenger: Codex performed fresh-fixture challenges; independent
  verification remains required for accepted P0/P1 remediation
- Baseline identity: reports/baseline-2026-07-11.md
- Started: 2026-07-11
- Last updated: 2026-07-11
- Status: complete with four accepted findings and one supply-chain evidence gap

## Scope

- Coverage rows: DATA-001 through DATA-016 and OP-001 through OP-015.
- AppBridge focus: privileged and destructive entry points, web RPC allowlist and
  validation, web-special storage/import/export methods, and Electron IPC exposure.
  Method-by-method user-visible parity remains Phase 4 work.
- User journeys: import/reattach, library backup/restore, deletion, reset, sample
  packs, and self-hosted web access.
- Runtimes: Electron desktop, self-hosted desktop web, and isolated Node/Chrome
  fixtures where runtime process proof was needed.
- Data/privileged boundaries: SQLite, app-owned MIDI files, desktop sample-pack
  files, web IndexedDB/localStorage, Electron preload/IPC, Hono routes, and
  deployment access.
- Explicit exclusions: mobile; hardware MIDI; Phase 3 music rules; Phase 4 complete
  behavioral parity; Phase 5 UI and accessibility; Phase 6 architecture ownership.

## Evidence Plan

| Surface | Oracle/invariant | Method/fixture | Runtime | Artifact |
|---|---|---|---|---|
| SQLite and MIDI lifecycle | Durable mutation is atomic or recoverable; IDs stay inside app-owned roots | Existing node tests plus fresh /tmp fault injection | Both | P2-DATA-001, PH-DATA-001 |
| Backup restore | V2 backup validates before mutation and preserves content identity | Existing round-trip tests plus partial-commit and mismatched-hash probes | Both | P2-DATA-001, P2-DATA-003 |
| Full reset | All named durable stores are cleared or explicitly retained | Disposable desktop userData and Chrome profile | Both | P2-DATA-002, PH-DATA-002 |
| Electron privileged operations | Renderer input cannot reach arbitrary filesystem paths | Fresh /tmp sentinel and production sample-pack removal function | Electron | P2-SEC-001, PH-SEC-001 |
| Web RPC, upload, and static paths | Allowlisted methods, validation, limits, and containment | Focused tests plus isolated live Node server requests | Web | P2-SEC-002 through P2-SEC-004 |
| Deployment/supply chain | Public access model is explicit and dependencies have a disposition | Isolated server with and without token, production-only npm audit | Web | P2-SEC-005 |

## Working Flows Confirmed

| Coverage row | Evidence | Conditions/limits | Disposition |
|---|---|---|---|
| DATA-001 through DATA-012 | 11 database tests exercise fresh initialization, legacy folder migration, result/theory side effects, settings, resets, achievements, trouble spots, and streaks. SQLite enables WAL and foreign keys at construction. | SQLite-only portions are transactional; cross-store operations are covered separately. | covered; PH-DATA-001 affects paths that combine these rows with files |
| DATA-002 | Five storage tests and six import tests prove safe ID path derivation, staging, single-song rollback, reattach hash checking, and cleanup. | Legacy filename-safe IDs are intentionally supported for reattach. | covered; PH-DATA-001 and PH-DATA-003 |
| DATA-013 | Five library-backup tests prove v2 embedded MIDI round trip, app-owned-source export, path traversal rejection, DB-failure staging cleanup, and v1 missing-MIDI reporting. | Existing tests did not inject a later staged commit failure or byte/hash mismatch. | covered; PH-DATA-001 and PH-DATA-003 |
| DATA-014 | Pack definitions constrain installation to known IDs; status metadata uses settings. Fresh removal probe found the unvalidated removal exception. | Desktop full reset leaves pack files behind. | covered; PH-SEC-001 and PH-DATA-002 |
| DATA-015 | Production webBridge uses a named IndexedDB pack store; a live Chrome profile retained a pack record after reset and still reported it installed. | Browser profile was disposable and independent of server data root. | covered; PH-DATA-002 |
| DATA-016 | Library filter presets are the renderer localStorage use; SettingsScreen clears localStorage during full reset. | IndexedDB is a separate store, not cleared by localStorage.clear. | covered; localStorage behavior works, PH-DATA-002 covers the separate store |
| OP-001, OP-002 | File dialogs constrain normal desktop selection; web MIDI routes reject no-file, extension, empty, oversize, duplicate, and hash-mismatched reattach inputs. Storage derives app-owned paths only. | Electron folder traversal and device UI are later workflow evidence. | covered; PH-DATA-001 and PH-DATA-003 where durable operations fail |
| OP-003 | Normal sample-folder selection uses an Electron dialog, but file:list-audio accepts any renderer path. | Read-side capability is less severe than PH-SEC-001's deletion primitive but shares the unattenuated IPC boundary. | covered; PH-SEC-001 |
| OP-004 | Desktop export uses save dialogs; web export creates a browser download from the self-contained response. | User-selected target behavior and UI cancellation remain Phase 4/5 parity evidence. | covered |
| OP-005 | Export/import route tests and isolated backup probes cover success, invalid structure, body limit, staging, failure, and content identity. | Recovery is incomplete after storage failures. | covered; PH-DATA-001 and PH-DATA-003 |
| OP-006 | Managed pack IDs are validated on installation; web pack data is local IndexedDB; desktop removal has a path traversal. | Full reset omits pack stores. | covered; PH-SEC-001 and PH-DATA-002 |
| OP-007 | SQLite bulk operations use transactions and foreign keys; a storage-delete failure leaves the database delete committed. | Partial failure is a confirmed cross-store defect. | covered; PH-DATA-001 |
| OP-008 | Database reset-learning-progress test verifies library/settings preservation and learning-state removal. | UI confirmation is a later UI lane concern. | covered |
| OP-009 | Web route test recreates MIDI directory; isolated delete/reset injection and desktop/browser pack probes cover the error and store boundaries. | Cross-store failure and omitted pack stores are confirmed defects. | covered; PH-DATA-001 and PH-DATA-002 |
| OP-010 | Router tests prove allowlist alignment, unknown method 404, malformed/invalid 400, request limit, payload validation, and app-owned song paths. | Full parity of successful/error shapes is Phase 4 work. | covered |
| OP-011 | Route tests enforce declared-size limits. A live 263,208-byte chunked RPC did not mutate data, but returned 400 rather than the configured 413. | Hono 4.6.14 has a direct audit advisory for unknown-length/chunked body-limit behavior. | gap; BASE-SEC-001 needs dependency remediation and regression proof |
| OP-012 | Isolated live server returned 404 for literal, percent-encoded, and encoded-backslash static traversal attempts; encoded MIDI path became a nonmatching song ID and returned 404. | Tests used no personal data. | covered |
| OP-013 | BrowserWindow uses contextIsolation and disables nodeIntegration; preload exposes a typed object. The sample-pack removal handler still trusts an unvalidated exposed argument. | Context isolation does not attenuate exposed capabilities. | covered; PH-SEC-001 |
| OP-014 | Live server binds all interfaces by default. With no token, export and reset returned 200; with LUMAKEYS_WEB_ACCESS_TOKEN, unauthenticated export returned 401 and a header-authenticated request returned 200. README explicitly requires Cloudflare Access before public exposure. | This is an intentional single-user deployment contract, not a new product finding. | covered; accepted deployment risk |
| OP-015 | Database construction enables WAL/foreign keys; tests prove legacy folder migration and multiple SQLite transactions. | Cross-store rollback/recovery is not solved by the SQLite transaction boundary. | covered; PH-DATA-001 |

## Durable Entity Disposition

| Coverage row | Evidence | Disposition |
|---|---|---|
| DATA-001 Songs metadata | database.test.ts initialization, update, reset, migration; bridge validation tests | covered; import/delete/reset cross-store inconsistency is PH-DATA-001 |
| DATA-002 MIDI bytes and references | midiStorage.test.ts, importSong.test.ts, libraryBackup.test.ts, isolated probes | covered; PH-DATA-001 and PH-DATA-003 |
| DATA-003 User stats | database.test.ts result-side-effect fixture | covered |
| DATA-004 Game results and measure accuracy | database.test.ts result/trouble-spot fixture | covered |
| DATA-005 Theory results | database.test.ts theory fixture | covered |
| DATA-006 Settings | database.test.ts initialization/reset plus SettingsRepository trace | covered |
| DATA-007 Custom fingerings | database.test.ts reset fixture and foreign-key schema trace | covered |
| DATA-008 Folders and membership | database.test.ts legacy migration and reset fixtures | covered |
| DATA-009 Playlists and ordered membership | database.test.ts reset fixture and transactional methods trace | covered |
| DATA-010 Practice days and streaks | database.test.ts streak and result/theory fixtures | covered |
| DATA-011 Achievements | database.test.ts initialization, unlock, and reset fixtures | covered |
| DATA-012 Trouble spots and history | database.test.ts result and update fixtures | covered |
| DATA-013 Backup versions and embedded MIDI | libraryBackup.test.ts plus P2-DATA-001 and P2-DATA-003 probes | covered; PH-DATA-001 and PH-DATA-003 |
| DATA-014 Desktop sample-pack files/metadata | instrumentSamplePacks tests, source trace, isolated deletion/reset probes | covered; PH-SEC-001 and PH-DATA-002 |
| DATA-015 Web IndexedDB sample assets | live Chrome IndexedDB/reset/status probe | covered; PH-DATA-002 |
| DATA-016 Browser localStorage/transient preferences | renderer search and SettingsScreen reset trace | covered; localStorage clears, IndexedDB exclusion is PH-DATA-002 |

## Isolated Runtime Evidence

### P2-DATA-001: Cross-Store Failure Injection

The backup probe used two valid song IDs, two staged files, and a fake adapter that
throws only on the second commit. The database import returned an error after its
transaction committed, so both song rows persisted but only one MIDI file did.

The delete/reset probe routed requests through createBridgeRouter with an adapter
whose delete/reset operation throws. Both requests returned 500 after the database
had removed the song data. See PH-DATA-001 for exact output and source locations.

### P2-DATA-002: Reset Store Inventory

The desktop probe created an instrument pack sentinel under disposable userData,
called the production database-plus-MIDI reset sequence, and found the sentinel still
present. The web probe created a pack record in the production IndexedDB database,
called the reset API plus the exact SettingsScreen localStorage clear, and found the
record still present and reported installed.

### P2-DATA-003: V2 Backup Content Identity

The probe used a valid SHA-256-form song ID computed from one byte sequence but
embedded another. importLibraryBackup accepted it, and hashing the restored bytes did
not reproduce the song ID. This proves that filename and byte-length checks do not
preserve the content-addressed invariant.

### P2-SEC-001: Electron Sample-Pack Traversal

A production removal-function call with ../../victim deleted a sibling sentinel
directory outside disposable userData. The path was reached through the exposed
remove-pack IPC handler without an ID allowlist or containment check. See
PH-SEC-001.

### P2-SEC-002: Web Access Deployment Controls

An isolated server at port 3312 listened on all interfaces. With no token,
GET /api/library/export and POST /api/bridge/resetUserData both returned 200. A
separate isolated server with LUMAKEYS_WEB_ACCESS_TOKEN rejected the same export
without credentials (401) and accepted it with the documented request header (200).

The documented deployment contract in README.md requires Cloudflare Access before
public exposure and labels the token gate optional. This makes unauthenticated LAN
operation an accepted deployment risk rather than a duplicate product finding.

### P2-SEC-003: Web Path Containment

The isolated live server returned 404 for:

- /../../package.json
- /%2e%2e/%2e%2e/package.json
- /%2e%2e%5c%2e%2e%5cpackage.json
- /api/midi/..%2F..%2Fpackage.json

No requested file outside the web root or app-owned MIDI storage was returned.

### P2-SEC-004: RPC and Body Limits

The 12 focused test files passed 88 tests. They cover RPC method/category alignment,
unknown methods, malformed input, payload validation, declared-size body limits,
path derivation, MIDI upload errors, library-import errors, and access-gate behavior.

A live chunked 263,208-byte RPC exceeded the 256 KiB bridge limit and did not write
the setting; a subsequent read returned null. It returned 400 with the route's
malformed-body message instead of the configured 413 response. This narrows the
known Hono body-limit advisory from a confirmed data mutation to a dependency and
error-contract gap in this deployment.

### P2-SEC-005: Production Dependency Reach

npm audit --omit=dev reports one direct high-severity dependency: Hono 4.6.14.
The active range is <=4.12.24 and npm reports a fix is available. Most individual
advisories target Hono features not used here, including JSX SSR, JWT, cache, CORS,
IP restriction, serve-static, or Lambda adapters. The relevant active concern is the
body-limit middleware advisory for chunked/unknown-length requests. No dependency
upgrade was performed during discovery.

## Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-SEC-001](findings/PH-SEC-001.md) | Electron IPC exposes an unvalidated path to recursive deletion outside app-owned storage. | Runtime parity, operations |
| [PH-DATA-001](findings/PH-DATA-001.md) | SQLite/filesystem mutations can partially commit after an error. | Runtime parity, operations |
| [PH-DATA-002](findings/PH-DATA-002.md) | Full reset omits desktop and web sample-pack stores. | Runtime parity, UI |
| [PH-DATA-003](findings/PH-DATA-003.md) | V2 restore accepts MIDI bytes that do not match the song content ID. | Music correctness, runtime parity |

## Evidence Gaps

| Coverage row | Missing proof | Why blocked | Owner | Next action |
|---|---|---|---|---|
| OP-006 | Forced managed/manual pack-install interruption at each copy step | No injectable pack-store seam exists; do not modify implementation during discovery. | Remediation owner | Add a staging/rollback seam and regression proof with PH-SEC-001/PH-DATA-002 work. |
| OP-011 | Fixed-version Hono chunked-body regression and memory-bound proof | Current direct Hono dependency has a known advisory; audit does not authorize an upgrade. | Remediation owner | Upgrade to an audited fixed version and add chunked/unknown-length 413 tests. |
| BR-001 through BR-069 | Complete Electron/web method outcome parity | This is explicitly Phase 4 work, not a Phase 2 security-only contract audit. | Runtime parity lane owner | Compare return/error, cancellation, and UI-visible outcomes method by method. |
| P0/P1 verification | Separate human or independent-agent verification of remediation | No remediation was authorized; current challenge used fresh fixtures by the acting audit lead. | Audit lead/verifier | Require independent verifier before status can become fixed or verified. |

## Runtime And Failure Coverage

- Electron: isolated source/function probes covered the privileged sample-pack removal
  and full-reset filesystem boundary. Baseline Electron startup remains valid.
- Web: isolated Node servers covered access gate behavior, route requests, path
  traversal, body limits, backup/reset, and a disposable Chrome IndexedDB profile.
- Loading/empty/disabled: empty export/reset server profiles returned valid outcomes;
  unsupported web filesystem stubs remain Phase 4 parity evidence.
- Error/retry/recovery: staged single-song import failures compensate correctly;
  backup, delete, and reset cross-store failures do not, as PH-DATA-001 shows.
- Destructive/interruption: safe /tmp fixture only; no production or personal data
  was opened, reset, or inspected.
- Accessibility or hardware proof: not Phase 2 scope.

## Challenge Summary

- Claims disproved or narrowed: production Hono body-limit behavior did not permit a
  263,208-byte chunked RPC to mutate state, though it failed the 413 error contract.
  The direct production dependency remains a remediation gap.
- Duplicates merged: backup partial commit, song delete failure, and reset failure
  share PH-DATA-001's database-before-filesystem root cause.
- Severity changes: PH-SEC-001 is P0 due to arbitrary recursive filesystem
  deletion; PH-DATA-001 is P1 due to core library/recovery data inconsistency;
  remaining findings are recoverable P2 issues.
- Environmental failures separated: npm audit dependency output is not itself a
  product finding; direct Hono body-limit exposure is retained as BASE-SEC-001.

## Lane Exit Check

- [x] Every assigned durable entity has an owner, evidence, and disposition.
- [x] Every privileged/destructive operation has an evidence disposition or an
  explicit gap.
- [x] All product findings link to detailed reports and coverage rows.
- [x] P0/P1 leads were challenged immediately in fresh isolated fixtures.
- [x] Positive/working behavior is recorded.
- [x] Manual, hardware, and deferred parity gaps are explicit.
- [x] Coverage summary counts are updated in coverage-matrix.md.

## Sign-Off

- Lane owner/date: Codex, acting, 2026-07-11
- Challenger/date: Codex fresh-fixture challenge, 2026-07-11; independent verifier
  required for P0/P1 remediation
- Audit lead/date: Codex, acting, 2026-07-11
