# Audit Charter

- Charter status: active
- Audit status: phase 10 verification in progress; immutable refactor baseline `d5839aa` plus verification fix `d4ba395`; 63 files/318 tests and both builds pass; BASE-SEC-001 resolved; PH-OPS-001 independently verified; six P0/P1 findings remain fixed pending named runtime/manual proof; Windows, Edge, physical MIDI/audio, zoom, and workflow matrices remain blockers
- Audit lead: Codex (acting; repository owner requested continuation)
- Source branch/worktree: `docs/audit-workflow` at `/media/storage/PianoHero`
- Source commit or patch identity: refactor baseline `d5839aa55a6c9d4796b24d42b23ab12dde06b854`; verification fixes `d4ba395eee6c5adcdecdce5226df79aa8ae79a93`; original discovery baseline retained in [the baseline report](reports/baseline-2026-07-11.md).
- Start date: 2026-07-11
- Target consolidation date: completed 2026-07-30

## Mission

Establish evidence-backed confidence in PianoHero's user workflows, music
correctness, data safety, supported runtime behavior, desktop UI, accessibility,
performance, architecture, and operations. Discovery identifies and disposes risks;
it does not authorize product changes.

## In Scope

- All user journeys listed in `CONTEXT.md`.
- Electron desktop and self-hosted web in desktop browsers.
- SQLite, MIDI/sample storage, settings, browser local state, and IndexedDB state.
- Every `AppBridge` method and privileged HTTP/file operation.
- Setup, import, practice, results, progress, lessons, theory, free play, soundboard,
  settings, backup/restore, reset, packaging, startup, and recovery.
- Product behavior, music correctness, security, accessibility, performance,
  maintainability, and operational readiness.

## Out Of Scope

- Mobile browsers, phone/tablet breakpoints, touch-first UI, and mobile performance.
- New product features or speculative SaaS/multi-tenant requirements.
- Broad refactoring based only on module size.
- Remediation during discovery.
- Testing against production or the owner's personal data.

## Supported Test Conditions

| Condition | Required value | Status |
|---|---|---|
| Minimum desktop window | `1180x780`; minimum required for the playing UI to fit without clashes | confirmed |
| Default window | 1480x960 | defined |
| Large desktop window | `1920x1080` | confirmed |
| Desktop zoom | 100%, 125%, 150%, 175%, 200% | defined |
| Pixel density | 1x and available high-DPI scale | defined |
| Motion | default and reduced motion | defined |
| Navigation | pointer and keyboard-only | defined |
| Input | computer keyboard and available MIDI hardware | defined |
| Electron platform(s) | Linux x64 and Windows x64 | confirmed |
| Desktop browser(s) | Current stable desktop Chrome, Edge, and Firefox | confirmed |

## Lanes

| Lane | Owner | Shared owner/reviewer | Status |
|---|---|---|---|
| Product workflows | Codex (acting) | Audit lead | 24 explicit workflow evidence gaps; Phase 10 package/Docker/recovery proof added; final readiness pending |
| Music correctness | Codex (acting) | Practice-engine review | phase 3 complete; accepted findings PH-MUS-001 through PH-MUS-004; hardware/audio proof gaps remain |
| Persistence | Codex (acting) | Runtime-data review | phase 2 complete; accepted findings PH-DATA-001 through PH-DATA-003 |
| Runtime parity | Codex (acting) | Persistence and security review | phase 4 complete; accepted findings PH-PAR-001 through PH-PAR-003; platform/package proof gaps remain |
| Security | Codex (acting) | Runtime-data review | PH-SEC-001 fixed pending Electron bridge proof; BASE-SEC-001 resolved with dependency update and stream regression |
| UI and accessibility | Codex (acting) | Product-workflow review | phase 5 complete; accepted findings PH-UI-001 through PH-UI-004; browser/color/hardware proof gaps remain |
| Performance | Codex (acting) | Practice/UI review | phase 5 complete; no standalone performance finding; active-GPU/soak proof remains a gap |
| Architecture | Codex (acting) | Audit lead | phase 6 complete; PH-ARCH-001 and PH-ARCH-002 accepted |
| Operations | Codex (acting) | Runtime-data review | PH-OPS-001 verified; Linux package and Docker restart pass; Windows runtime remains blocked |
| Challenge/consolidation | Codex (acting) | Lane owners | phase 7 complete; all 18 findings challenged and dispositioned; no accepted risks |
| Remediation planning | Codex (acting) | Finding owners and verifiers TBD | phase 8 complete; all 18 accepted findings mapped to vertical slices in the Phase 8 plan |
| Final verification | Codex (acting) | independent fresh-context verifier | phase 10 active; PH-OPS-001 verified; six P0/P1 runtime/manual proof gaps remain |

## Preconditions

| Gate | Evidence required | Status |
|---|---|---|
| Architecture-fix UI work stabilized | Dirty patch hashes in [baseline report](reports/baseline-2026-07-11.md) preserve the existing UI work without modifying it | complete |
| Dedicated audit branch/worktree | Existing `docs/audit-workflow` worktree at `/media/storage/PianoHero`; discovery is read-only outside `docs/audit/*` | complete |
| Dependency installation repaired | Lockfile-preserving `npm ci` restored executable launchers and esbuild; runtime-aware native-module guards now select the active ABI | complete |
| Typecheck baseline | `npm run typecheck` passes; evidence in [baseline report](reports/baseline-2026-07-11.md) | complete |
| Full test baseline | `npm test` passes 57 files and 285 tests against isolated data; evidence in [baseline report](reports/baseline-2026-07-11.md) | complete |
| Desktop build baseline | `npm run build` passes; generated output was not committed | complete |
| Web build baseline | `npm run build:web` passes with isolated data; generated output was not committed | complete |
| Package/security baseline | `npm audit` completed; 48 dependency advisories are recorded as leads, not findings, in the [baseline report](reports/baseline-2026-07-11.md) | complete |
| Electron startup smoke | Isolated Xvfb smoke rendered a `1480x960` LumaKeys window and exited cleanly after SIGTERM; see [baseline report](reports/baseline-2026-07-11.md) | complete |
| Web startup smoke | Isolated server and Chrome smoke completed first-run setup, main-menu navigation, and clean shutdown; see [baseline report](reports/baseline-2026-07-11.md) | complete |
| Isolated data profile | `/tmp/pianohero-audit-20260711-phase0`; retain only for the audit and remove after final consolidation | complete |
| Test conditions confirmed | Repository owner confirmed the desktop window, Electron platform, and browser matrix on 2026-07-11 | complete |

No audit lane moves to evidence collection while a precondition is blocked unless the
audit lead records a narrow exception, its effect on confidence, and an expiry.

## Finding Standard

Every finding must contain:

- ID, lane, severity, confidence, and status.
- User impact and affected runtime(s).
- Exact evidence, environment, and reproduction steps.
- Expected behavior or correctness oracle.
- Root cause, not only the symptom.
- Recommended remediation boundary.
- Required automated, runtime, recovery, and manual regression proof.
- Links to coverage rows and related/duplicate findings.

Use `templates/finding.md`; use P0-P3 and the statuses in `README.md`.

## Evidence Rules

- Cite file and line, command and output summary, test fixture, screenshot/trace hash,
  or an exact manual procedure.
- Label static inference as inference. It cannot by itself establish a runtime failure.
- Record environmental failures separately from product failures.
- Hardware claims name device, connection, OS, driver/browser, and repeat count.
- Canvas proof includes a screenshot and a nonblank pixel check at the tested scale.
- Security findings include the trust boundary, attacker capability, input, and impact.
- Data-safety findings include setup, interruption/failure point, resulting durable
  state, recovery attempt, and integrity check.

## Stop Conditions

Pause the affected lane and notify the audit lead when:

- A test risks production/personal data.
- A P0 is reproduced.
- Required evidence would need destructive external action not already authorized.
- The baseline changes during evidence collection.
- A dependency or environment failure makes results unreliable.

## Completion

The audit completes only under the objective completion condition in `README.md`.
Residual suspected items must have an owner, evidence gap, next action, and due/revisit
trigger; otherwise the lane is incomplete.

## Approval

- Repository owner: support matrix confirmed in this audit session on 2026-07-11
- Audit lead: Codex (acting)
- Date approved for Phase 1 planning: 2026-07-11
