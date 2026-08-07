# LumaKeys Audit Consolidation

- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus tracked working-tree diff SHA-256 `1bc69ee417613bde56d64630e7cfd4b30ad976d3b80d363a166fb8bcef9c57ae` and the chartered untracked-source inventory
- Audit period: 2026-07-11 through 2026-07-30
- Audit lead: Codex (acting)
- Lane reports: [baseline](baseline-2026-07-11.md), [Phase 1](phase-1-inventory-2026-07-11.md), [Phase 2](phase-2-runtime-data-security-2026-07-11.md), [Phase 3](phase-3-music-practice-correctness-2026-07-11.md), [Phase 4](phase-4-runtime-parity-2026-07-12.md), [Phase 5](phase-5-ui-accessibility-performance-2026-07-12.md), and [Phase 6](phase-6-architecture-operations-2026-07-12.md)

## Readiness Decision

- Overall disposition: Stage 7 challenge and consolidation is complete, but the
  product is not ready for release/deployment sign-off. Phase 8 remediation planning,
  accepted-finding remediation, and final readiness proof remain.
- Release/deployment blockers: PH-SEC-001 plus six accepted P1 findings; 30 matrix
  rows retain explicit evidence gaps.
- Residual P0/P1 count: 7 (one P0, six P1).
- Accepted-risk count: 0.
- Evidence confidence limits: Linux Electron and Chrome received the strongest
  runtime proof. Windows, Edge, Firefox, named MIDI/audio hardware, representative
  GPU/soak, destructive recovery, installed packages, and several workflow state
  matrices remain unverified.

## Coverage

Totals are copied from `coverage-matrix.md`. A covered row may still link an
accepted finding; a gap row names missing proof rather than implying a defect.

| Dimension | Total | Covered | Gap/blocked/waived | Findings |
|---|---:|---:|---:|---:|
| User workflows | 24 | 0 | 24 | 13 |
| Runtime/UI conditions | 11 | 6 | 5 | 5 |
| Durable entities/stores | 16 | 16 | 0 | 7 |
| AppBridge methods | 69 | 69 | 0 | 10 |
| Privileged/destructive operations | 15 | 14 | 1 | 8 |
| High-risk modules/operations | 12 | 12 | 0 | 17 |
| **Total** | **147** | **117** | **30** | **18 unique** |

## Findings By Disposition

| Severity | Suspected | Accepted | Fixed | Verified | Accepted risk |
|---|---:|---:|---:|---:|---:|
| P0 | 0 | 1 | 0 | 0 | 0 |
| P1 | 0 | 6 | 0 | 0 | 0 |
| P2 | 0 | 11 | 0 | 0 | 0 |
| P3 | 0 | 0 | 0 | 0 | 0 |

All 18 findings have a detailed report and challenge record. Consolidation found no
unsupported or duplicate ledger entries and did not change severity.

## Highest-Risk Conclusions

1. [PH-SEC-001](findings/PH-SEC-001.md) is the sole P0: a renderer-controlled sample
   pack identifier can escape the app-owned directory during Electron removal and
   delete an arbitrary directory available to the user account.
2. [PH-DATA-001](findings/PH-DATA-001.md) commits SQLite mutations before related
   filesystem operations in destructive/restore flows, allowing cross-store state to
   diverge on failure.
3. [PH-MUS-001](findings/PH-MUS-001.md) and [PH-MUS-002](findings/PH-MUS-002.md)
   compromise core practice truth: live controls erase judged state, and imported
   meter/tempo structure is replaced by a fixed 4/4 map.
4. [PH-PAR-001](findings/PH-PAR-001.md) leaves required curriculum, soundboard, menu,
   and managed-pack assets out of fresh Electron production output.
5. [PH-UI-002](findings/PH-UI-002.md) makes Settings sections inaccessible at the
   required 150-200% desktop zoom range.
6. [PH-OPS-001](findings/PH-OPS-001.md) allows default data and environment files into
   the Docker build context and image layers.

These are current failures on the audited baseline, not optional future
improvements. No release exception or accepted-risk disposition was authorized.

## Positive Evidence

- The complete 69-method AppBridge inventory has typed Electron/web ownership and a
  disposition; valid shared RPC paths reach common database behavior.
- Disposable data probes confirmed WAL/foreign-key initialization, schema migration,
  normal MIDI import staging, database transactions, path-containment checks, and
  non-mutating malformed web requests.
- Deterministic tests confirmed simple MIDI parsing, scoring-window boundaries, wait
  mode, generated drills, pure theory rules, held-note multi-source behavior, and
  result handoff outside the accepted findings.
- Fresh Linux Electron and Chrome profiles completed startup/setup smoke. Chrome also
  covered library upload, gameplay, Free Play, Soundboard, and Settings navigation.
- Gameplay, Free Play, and Soundboard canvases produced framed nonblank pixels at the
  tested desktop geometry; default/minimum/large main-menu layouts passed.
- Strict typecheck, 57 files/285 tests, desktop build, web build, Compose rendering,
  and native ABI selection passed in the recorded Phase 6 baseline.

## Runtime, Recovery, And Hardware Proof

- Electron: Linux x64 startup, setup, core navigation, IPC probes, 1x canvas, keyboard
  behavior, zoom, reduced motion, and production asset output were exercised in
  disposable profiles. Windows and installed-package proof remain gaps.
- Desktop web: built Chrome runtime covered setup, library/gameplay, Settings,
  high-DPI canvases, picker cancellation, RPC/MIDI routes, and legacy migration.
  Edge and Firefox remain gaps.
- Backup/restore: normal shape/route behavior and isolated failure probes exist;
  PH-DATA-001, PH-DATA-003, PH-PAR-002, and full user-driven recovery proof remain.
- Reset/recovery: SQLite/MIDI/localStorage behavior and retained sample-pack stores
  were probed. Destructive end-to-end reset and interruption recovery remain gaps.
- Packaging: fresh desktop/web builds and output inventories exist. PH-PAR-001 blocks
  Electron readiness; Windows and installed-artifact launch are unverified.
- MIDI/audio hardware: deterministic fake-device service evidence exists. No named
  physical MIDI device, audible latency loopback, or reconnect proof was available.
- Desktop UI/zoom/DPI/accessibility: Linux Electron and Chrome provide the strongest
  evidence. Accepted focus/zoom/motion findings remain, and calibrated color-vision,
  Edge, Firefox, representative GPU, and soak proof are outstanding.

## Accepted Risks And Evidence Gaps

No finding was accepted as risk. The following gaps have owners and revisit
triggers; they prevent final readiness but do not prevent the Stage 7 finding gate.

| Item | Rationale | Owner | Revisit trigger |
|---|---|---|---|
| WF-001 through WF-024 | Every workflow still lacks at least one required default, failure, recovery, destructive, or interaction state; the matrix now marks all 24 explicitly as gaps. | Workflow verifier | Before Phase 10 final readiness. |
| Windows, Edge, and Firefox | The audit environment provided Linux Electron and Chrome only. | Runtime/UI verifier | After blocker remediation and before release sign-off. |
| MIDI and physical audio | No named device, driver matrix, or loopback rig was available. | Runtime/UI verifier | Before MIDI/audio release-readiness claims. |
| Installed package and representative GPU/soak | PH-PAR-001 already invalidates current Electron output; headless Xvfb is not representative performance proof. | Operations/performance verifier | After PH-PAR-001 remediation. |
| Hono body-limit behavior (BASE-SEC-001/OP-011) | The direct Hono advisory needs an upgrade and chunked 413 regression before product classification. | Security/remediation owner | During dependency remediation and before deployment. |
| Color-independent result states | Source labels and alternate palettes exist, but no calibrated color-vision review was performed. | Accessibility verifier | Before accessibility sign-off. |

## Remediation Roadmap

Phase 8 should convert these accepted boundaries into individual vertical slices,
keeping unrelated cleanup out:

1. PH-SEC-001: contain and validate sample-pack deletion, then prove no outside path
   can be removed in a disposable Electron profile.
2. PH-DATA-001: make each destructive/restore cross-store operation recoverable and
   verify before/failure/restart state.
3. PH-MUS-001: preserve judged practice state across live controls.
4. PH-MUS-002: carry parsed measure/time-signature/tempo structure through every
   gameplay and trouble-spot consumer.
5. PH-PAR-001: define one production asset policy and verify built/installed Electron
   curriculum, soundboard, menu, and managed-pack paths.
6. PH-UI-002: make every Settings tab reachable by pointer and keyboard at 100-200%
   zoom in both runtimes.
7. PH-OPS-001: minimize and assert the Docker build context before another image is
   distributed.
8. Remaining P2 slices, ordered by data/music correctness and shared workflow:
   PH-DATA-003, PH-MUS-003, PH-MUS-004, PH-DATA-002, PH-PAR-002, PH-PAR-003,
   PH-UI-001, PH-UI-003, PH-UI-004, PH-ARCH-001, and PH-ARCH-002.

## Sign-Off

- Lane owners: Codex (acting), evidence recorded in Phase 1 through Phase 6 reports
- Challengers: Codex fresh-fixture/profile/runtime challenges; no independent human
  challenger was available, so independent P0/P1 remediation verification remains
  mandatory
- Audit lead: Codex (acting), Stage 7 gate signed 2026-07-30
- Repository owner: pending; no release, accepted-risk, or remediation authorization
  is inferred from this consolidation
