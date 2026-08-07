# Phase 10 Verification Report

- Refactor baseline: `d5839aa55a6c9d4796b24d42b23ab12dde06b854`
- Verification fixes: `d4ba395eee6c5adcdecdce5226df79aa8ae79a93`
- Verification date: 2026-08-07
- Implementer: Codex acting
- Independent verifier: separate fresh-context verification agent
- Test data: isolated roots under `/tmp`; no personal or production data used

The final documentation update is part of the same verification change set as this
report. Generated `out/` and `dist/` artifacts remain untracked/ignored.

## Automated Baseline

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` | pass, 63 files and 318 tests |
| `npm run build` | pass |
| `npm run build:web` | pass |
| `npm audit --omit=dev` | pass, 0 vulnerabilities |
| `node scripts/assert-electron-assets.mjs` | pass, 646 public files |
| `npm run package:local` | pass, Linux unpacked directory and AppImage |
| `npm run package:win` | blocked after `win-unpacked`; Wine unavailable |

Hono was upgraded to `4.13.0` and `@hono/node-server` to `2.1.0`. A new
unknown-length `ReadableStream` regression proves an oversized bridge request
returns 413 without mutating settings.

The three recorded Settings failures were closed: one stale tab assertion was
corrected and document-capture Escape/Tab behavior now passes. Independent review
also found that PH-MUS-001 still affected structural controls. Mode, hand, loop,
and track-assignment changes now require confirmation after any judgement and
restart explicitly at zero when accepted.

## Runtime Evidence

### Electron And Packaging

- Fresh Linux package built from `d4ba395` after restoring the Linux native ABI.
- `dist/linux-unpacked/luma-keys` and the AppImage both opened a `LumaKeys`
  `1480x960` window under Xvfb with isolated profiles.
- AppImage SHA-256:
  `ef72e81301e215d380fc5408a662ffad0032b20910d77e6b7905b9a953d3be44`.
- Asset inventory includes all four curriculum MIDIs, soundboard media, menu media,
  and nine managed-pack manifests plus assets.
- MIDI device access warned because `/dev/snd/seq` is unavailable. No physical MIDI
  or audible loopback proof was possible.
- Windows `win-unpacked` assembly completed, but portable finalization and launch
  are blocked because Wine and a Windows runtime are unavailable.

### Web And Browsers

- Bundled server served `/`, API access, JS, CSS, curriculum, soundboard, and pack
  assets with expected 200 responses.
- Encoded-backslash traversal returned 404.
- Chrome and Chromium executed the renderer and displayed the service-loading UI.
  Headless audio initialization prevented a complete journey smoke.
- Firefox could not map a headless framebuffer. Edge is not installed.

### Docker

- No-cache image: `pianohero-audit:verification`, image
  `sha256:e6ae10195b61b59416186d342bf7a4c3c334bdf4fa879aa57544fa82ae621a2c`.
- Synthetic `.env.audit-sentinel` was excluded from the build context and final
  image. `.pianohero-data`, SQLite, MIDI, and checkout data were absent under
  `/app`.
- Container `pianohero-audit-run` served `/api/access` at 200 with only
  `/tmp/pianohero-docker-data:/data` mounted.
- Setting `audit/dockerRestart=persisted` survived `docker restart` and read back
  through the API.

### Crash Recovery

An isolated process prepared each operation through the `db-committed` state and
was terminated with SIGKILL. A fresh process then called startup recovery:

- delete: journal removed, row absent, MIDI absent;
- reset: journal removed, rows/settings absent, MIDI absent;
- restore: journal removed, row present, MIDI bytes intact.

## P0/P1 Disposition

| Finding | Status | Independent conclusion / remaining proof |
|---|---|---|
| PH-SEC-001 | fixed | Source and unit proof pass; Electron bridge sentinel and web IndexedDB runtime proof remain. |
| PH-DATA-001 | fixed | Source, fault injection, and SIGKILL recovery pass; complete Electron/web UI retry and full library integrity matrices remain. |
| PH-MUS-001 | fixed | Independent source recheck passes after structural-control fix; real MIDI/computer-keyboard completion and persisted result history remain. |
| PH-MUS-002 | fixed | Parser/loop evidence passes; 6/8, changing-meter cross-runtime import, persistence, and musician proof remain. |
| PH-PAR-001 | fixed | Fresh build/package/assets and Linux launch pass; capstone/managed-pack workflow and visible missing-asset recovery proof remain. |
| PH-UI-002 | fixed | Source and Settings tests pass; actual 125-200% Electron/Chrome/Edge/Firefox hit-testing remains. |
| PH-OPS-001 | verified | Independent source review plus synthetic context, final image, isolated startup, and restart persistence satisfy all required proof. |

## Remaining Release Blockers

- Windows portable launch.
- Edge and complete Firefox browser journeys.
- Physical MIDI disconnect/reconnect and MIDI/computer-keyboard practice proof.
- Audible latency loopback on named audio hardware.
- Electron and browser zoom/hit-testing matrix at 125-200%.
- Full user-driven capstone, managed-pack, recovery, and destructive workflow matrices.

The audit remains active. No unsupported runtime or hardware result is waived or
reported as passing.
