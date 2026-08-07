# Phase 6: Architecture And Operations - 2026-07-12

- Lane owner: Codex (acting)
- Reviewer/challenger: Codex direct failure and disposable-build challenges;
  independent verifier remains required before a P1 remediation is marked verified
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Started: 2026-07-12
- Last updated: 2026-07-12
- Status: complete with two accepted P2 architecture findings and one accepted P1 operations finding

## Scope

- Coverage rows: MOD-001 through MOD-012, plus the affected workflow, bridge,
  and deployment rows for reproduced Phase 6 findings.
- Concerns: ownership, dependency direction, duplicated knowledge, error
  handling, test seams, build/package inputs, native modules, Docker delivery,
  recovery, logging, and documentation.
- Runtimes: Electron desktop, self-hosted desktop web, and Docker web delivery.
- Explicit exclusions: mobile under ADR 0001, remediation, real user data,
  package publication, actual installed-artifact testing while PH-PAR-001 blocks
  the required asset set, and untested hardware/platform claims.

## Evidence Plan

| Surface | Oracle/invariant | Method | Artifact |
|---|---|---|---|
| Renderer ownership | A user-visible operation owns its load, error, retry, and persistence result. | Static trace plus rejected bridge probes. | PH-ARCH-001, PH-ARCH-002 |
| Runtime adapters | Renderer crosses one typed bridge seam; host adapters own privileged behavior. | Contract, import, and adapter-test trace. | Existing Phase 2/4 evidence |
| Domain/storage modules | Deep modules keep durable and musical rules local without size-only refactors. | Prior deterministic evidence plus module/deletion review. | Existing PH-DATA and PH-MUS findings |
| Canvas/CSS | Rendering cleanup and layout ownership are tied to observed UI behavior. | Phase 5 canvas/layout evidence and source trace. | Existing PH-UI-002/003 |
| Release inputs | Built assets, native modules, Docker context, and deployment documentation agree. | Fresh builds, Compose render, native guard, Docker sentinel build. | PH-PAR-001, PH-OPS-001 |

## Working Architecture And Operations

| Coverage row | Evidence and disposition |
|---|---|
| MOD-001 | AppDatabase is a deep persistence module: schema, migrations, WAL/foreign-key initialization, and transactional SQLite work remain local. Phase 2 already isolates its cross-store exception as PH-DATA-001; no size-only split is justified. |
| MOD-002 | App owns route orchestration, host input/audio lifetimes, and bridge startup. It preserves renderer/main direction, but PH-UI-004 and PH-ARCH-002 show that global navigation and durable-setting outcomes need more locality. |
| MOD-003 | GameScreen cleans up input subscriptions, timers, metronome intervals, animation frames, and audio on unmount. Existing music/UI findings remain canonical; PH-ARCH-001 adds the missing preflight failure outcome. |
| MOD-004 | LibraryScreen uses a request identity to suppress stale refresh results and routes all storage through AppBridge. Browser cancellation remains PH-PAR-002; no separate ownership defect was reproduced. |
| MOD-005 | SettingsScreen supplies a visible managed write-failure path, reset states, and modal focus behavior. PH-ARCH-002 shows that this policy is not the single renderer owner for durable settings. |
| MOD-006 | FreePlayCanvasScene has one animation-loop cleanup and high-DPI output remains evidenced in Phase 5. Its reduced-motion defect is PH-UI-003, not a size finding. |
| MOD-007 | Shared CSS contains route and component knowledge, but Phase 5 ties its current observable failure to the Settings tab overflow in PH-UI-002. No broad CSS refactor is recommended from line count alone. |
| MOD-008 | Electron constructs its own database/storage adapters, uses context isolation, disables Node integration, and exposes the typed bridge through preload. PH-SEC-001 and PH-PAR-003 remain the distinct trust/parity defects. |
| MOD-009 | WebBridge keeps browser-only picker, download, and IndexedDB behavior in the browser adapter. Its picker cancellation and legacy handling remain PH-PAR-002/003. |
| MOD-010 | Server routes receive database/storage adapters, use bridge method categorization and validation, and retain Phase 2 access/body-limit dispositions. No duplicate security finding is created. |
| MOD-011 | Game, MIDI, audio, and input modules have deterministic rule tests; PH-MUS-001 through PH-MUS-004 preserve the observed music/lifecycle defects and named hardware/audio proof remains a gap. |
| MOD-012 | Native ABI guards and fresh builds work, while Electron public assets remain PH-PAR-001. Docker delivery has a separate confidential-build-context defect, PH-OPS-001. |

## Architecture Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-ARCH-001](findings/PH-ARCH-001.md) | Practice loading splits prerequisite bridge reads from its visible error/recovery owner. | Workflows, bridge, game lifecycle |
| [PH-ARCH-002](findings/PH-ARCH-002.md) | Durable settings writes have multiple renderer owners with inconsistent failure semantics. | Workflows, bridge, settings |

## Operations Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-OPS-001](findings/PH-OPS-001.md) | Docker packaging can carry local durable data or environment files into image layers. | Deployment, data confidentiality |

## Recommendations Without A New Finding

| Candidate | Behavioral evidence | Recommendation strength |
|---|---|---|
| Electron IPC channel alignment | Preload and main map the typed bridge through separately spelled IPC channel strings; no mismatch was reproduced. | Worth exploring: add a focused preload/main alignment test or shared descriptor while retaining the explicit allowlist. |
| Practice-session operation depth | PH-MUS-001 and PH-ARCH-001 show that changing or loading a session crosses scoring state, audio, bridge reads, and UI recovery. | Strong: explore one deeper session operation after remediation is authorized; do not refactor by file size. |
| Settings write locality | PH-ARCH-002 directly reproduces divergent durable-write feedback. | Strong: remediate through one result-owning setting operation, not a broad screen rewrite. |
| Asset location policy | PH-PAR-001 directly reproduces incompatible Electron/web build output. | Strong: remediate with a canonical build input/output policy and asset manifest assertion. |

## Operational Evidence

| Check | Result | Disposition |
|---|---|---|
| `npm run typecheck` | pass | Strict TypeScript has no diagnostics. |
| Isolated `npm test` | pass | 57 files and 285 tests passed. |
| `npm run build` | pass with known warnings | PH-PAR-001 remains: Electron build leaves public main-menu references unresolved. |
| Isolated `npm run build:web` | pass with chunk warning | Web client/server build succeeds; 685.71 kB initial chunk remains a measured non-finding. |
| `docker compose config` | pass | Documented port, bind mount, and restart policy render correctly. |
| `npm audit --omit=dev` | exit 1 | One direct high Hono advisory remains BASE-SEC-001. |
| Disposable Docker context | fail invariant | PH-OPS-001 embeds synthetic data/env sentinels under current ignore/copy rules. |

Complete command outputs and temporary-fixture constraints are retained in
[Phase 6 probe evidence](../evidence/phase-6-probes-2026-07-12.md).

## Evidence Gaps

| Coverage row | Missing proof | Why blocked or deferred | Owner | Next action |
|---|---|---|---|---|
| MOD-012, BR-067 | Installed Electron package artifact after PH-PAR-001 remediation. | Current build already omits required assets; a package run cannot establish readiness. | Remediation verifier | Build/package and launch a fresh artifact after the asset fix. |
| MOD-012 | Windows package/native-module launch. | Windows runtime is unavailable in this audit environment. | Operations verifier | Run package and fresh-profile launch on Windows x64. |
| MOD-011 | Named MIDI/audio hardware and physical latency/recovery evidence. | No device or loopback rig is available. | Runtime/UI verifier | Follow the Phase 3 hardware plan. |
| MOD-006/007 | Representative GPU/soak and color-vision review. | Headless environment is not representative. | UI/performance verifier | Run supported desktop profile after remediation. |
| OP-011 | Chunked body-limit 413 behavior after a Hono update. | BASE-SEC-001 requires dependency remediation. | Security/remediation owner | Upgrade with a controlled regression fixture. |

## Runtime And Failure Coverage

- Electron: adapter ownership, context isolation, preload contract, native guard,
  and fresh build were reviewed. Public asset output remains PH-PAR-001.
- Web: bridge/category validation, server dependency injection, access-gate
  assumptions, fresh build, and Compose configuration were reviewed. The Docker
  context defect is PH-OPS-001.
- Loading/empty/disabled: library staleness guard and runtime capability gates
  remain covered by earlier lanes; PH-ARCH-001 adds preflight failure recovery.
- Error/retry/recovery: PH-ARCH-001 and PH-ARCH-002 prove two missing renderer
  error owners. Existing data/music/UI findings retain their own recovery rules.
- Destructive/interruption: no real data or live deployment was touched; all
  Docker and renderer failures used isolated synthetic fixtures.
- Observability: current user-visible status and browser/main console behavior
  were inspected where findings were reproduced. Structured production logging
  and packaged deployment soak proof remain operational readiness gaps, not a
  new defect without a demonstrated lost diagnosis workflow.

## Challenge Summary

- Claims disproved or narrowed: settings reload concerns did not overwrite a
  queued range value under normal focus movement because the blur path flushes
  it first; no finding was created. Module size alone did not justify a refactor.
- Duplicates merged: PH-DATA-001, PH-PAR-001, PH-MUS-001 through PH-MUS-004,
  and PH-UI-001 through PH-UI-004 retain their existing roots.
- Severity changes: Docker build-context confidentiality is P1 because image
  delivery can expose durable data or secrets; both renderer failures are P2
  because their user workflows recover but provide misleading or missing status.
- Environmental failures separated: the direct Hono advisory, unavailable
  Windows/hardware/GPU evidence, and untested installed package artifact remain
  explicit gaps rather than Phase 6 product conclusions.

## Lane Exit Check

- [x] Every assigned coverage row has an owner.
- [x] Every assigned row has evidence and a disposition, or an explicit gap.
- [x] All findings link to detailed reports and coverage rows.
- [x] The P1 operations finding was challenged with a disposable build context;
  independent remediation verification remains required.
- [x] Positive/working behavior is recorded.
- [x] Manual, hardware, platform, and package gaps are explicit.
- [x] Coverage summary counts were updated.

## Sign-Off

- Lane owner/date: Codex (acting), 2026-07-12
- Challenger/date: Codex isolated renderer/Docker challenges, 2026-07-12;
  independent verifier required for P1 remediation
- Audit lead/date: Codex (acting), 2026-07-12
