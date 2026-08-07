# LumaKeys Validation Profile

Use this profile to choose proof for baselines, lane audits, remediation, and final
readiness. Commands run from the repository root against isolated data.

## Environment Repair

If Vitest/Vite/esbuild cannot start because the installed native binary is invalid:

1. Record the exact failure in a baseline draft.
2. Confirm Node/npm/OS architecture and lockfile state.
3. Perform a lockfile-preserving clean dependency install appropriate to the current
   environment; do not upgrade versions as repair.
4. Verify Vite/Vitest/esbuild can start.
5. Record any lockfile or tracked-file changes before capturing a fresh baseline.

Environment repair is not a product fix and must not be mixed into audit findings.

## Proof Levels

| Level | Use | Required proof |
|---|---|---|
| V0 | Documentation/governance only | Link/content checks and clean diff review |
| V1 | Narrow deterministic logic | Targeted test plus `npm run typecheck` |
| V2 | Shared renderer/domain behavior | Targeted tests, typecheck, then full `npm test` |
| V3 | Persistence/bridge/Electron | Targeted tests, full tests, `npm run build`, isolated runtime/recovery smoke |
| V4 | Web server/runtime/security | Targeted tests, full tests, `npm run build:web`, isolated web smoke/security proof |
| V5 | Release/readiness | Typecheck, full tests, desktop/web builds, relevant packaging, startup, backup/restore/reset recovery, UI, and hardware proof |

When a change crosses V3 and V4 surfaces, run both. A passing typecheck never proves
runtime, persistence, canvas, audio, or hardware behavior.

## Baseline Commands

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run build:web`
- `npm audit`

Run startup smoke tests with an absolute isolated `LUMAKEYS_DATA_DIR=/tmp/...` for
web. Use a disposable Electron profile for destructive desktop proof. Record exact
commands, versions, duration, result, and concise error output in the baseline report.

## Targeted First

During remediation, start with the smallest test that reproduces the finding. Expand
to the affected lane, then to the proof level required by the boundary. Full-suite
green is not a substitute for the finding's specific regression test.

## Manual Proof

- Desktop UI: conditions in `lumakeys-ui-audit-profile.md`.
- MIDI/audio: named device, OS/runtime, connection, scenario, repeat count, and
  observed latency/correctness.
- Data/recovery: fresh fixture, state before/after interruption, restart, recovery,
  and integrity comparison.
- Packaging: built artifact identity, clean-machine/profile launch, storage location,
  native module load, and clean shutdown.

## Reporting

Always distinguish `pass`, `fail`, `blocked`, and `not run`. State why a required
check was skipped and what uncertainty remains. Do not mark a finding `verified`
until its finding report's required regression proof is complete.
