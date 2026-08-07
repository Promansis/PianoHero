# Phase 6 Probe Evidence - 2026-07-12

All probes used source identity `808e6739e55b5186e8a9565f2c4e9267c4894a6c`
plus the chartered tracked-patch SHA-256. They used disposable files under
`/tmp`; no production database, MIDI file, browser profile, token, or user data
was opened. The temporary harnesses and Docker image were removed after their
results were recorded here.

## Game Preflight Failure

An isolated Vitest 2.1.9/jsdom renderer harness mounted the production
`GameScreen` with a valid lesson-drill fixture. It rejected every
`window.appBridge.getSetting(...)` call with `Error('storage unavailable')`,
opened the session overlay with Escape, and asserted the expected visible
message:

```text
Unable to load song: storage unavailable
```

The assertion failed after 1.08 seconds. The visible status remained:

```text
Loading song from the library.
```

Vitest also reported one unhandled rejection, `Error: storage unavailable`.
The harness used the production source with visual child modules stubbed only to
keep the probe focused on loading state. Reproduce by mounting a lesson-drill
source, rejecting one prerequisite `getSetting`, pressing Escape, and inspecting
the session overlay status.

The source trace shows why: `GameScreen` awaits prerequisite settings at
`src/renderer/components/GameScreen.tsx:624` before its only `try/catch` begins
at line 661, then starts that async routine with `void` at line 676.

## Keyboard Mapping Write Failure

An isolated Vitest 2.1.9/jsdom harness mounted the production
`KeyboardSetupScreen` and a minimal in-memory computer-keyboard input adapter.
It rejected `window.appBridge.setSetting(...)` with `Error('write failed')`,
selected `Bind C3 to Z`, and sent `KeyA`.

The probe deliberately expected a persistence-failure message. That assertion
failed after 1.14 seconds. The visible screen instead said:

```text
C3 set to A.
```

The live adapter mapping also changed to `KeyA`. The source starts the durable
write with `void` at `src/renderer/components/KeyboardSetupScreen.tsx:114` and
reports success at line 120. A later mount reads the mapping from storage at
line 79, so the rejected write is not a documented session-only choice.

## Docker Build Context

A disposable Docker context copied the repository's six-line `.dockerignore`
unchanged, contained only a fake `.pianohero-data/sentinel` and fake `.env`, and
used the same `COPY . .` form as the production Dockerfile. Its final build step
was:

```dockerfile
RUN test -f .pianohero-data/sentinel && test -f .env
```

The isolated command passed:

```text
docker build --no-cache --tag pianohero-phase6-docker-probe:latest /tmp/pianohero-phase6-docker-context
...
RUN test -f .pianohero-data/sentinel && test -f .env
DONE
```

The image was removed immediately after the check. `git check-ignore -v` exited
1 with no matching rule for both `.pianohero-data/audit-sentinel` and `.env`.
The production server defaults to `.pianohero-data` at
`src/server/index.ts:14`, while `Dockerfile:11` copies the full context and
`.dockerignore` contains neither exclusion.

## Current Validation

| Check | Result | Summary |
|---|---|---|
| `npm run typecheck` | pass | Strict TypeScript completed with no diagnostics. |
| `PIANOHERO_DATA_DIR=/tmp/pianohero-audit-20260712-phase6 npm test` | pass | 57 files and 285 tests passed. |
| `npm run build` | pass with known warning | Electron output still leaves the two known public main-menu references unresolved; PH-PAR-001 remains canonical. |
| `PIANOHERO_DATA_DIR=/tmp/pianohero-audit-20260712-phase6 npm run build:web` | pass with known warning | Web server/client built; one 685.71 kB minified chunk warning remains. |
| `docker compose config` | pass | Resolved the documented `/media/storage/pianohero:/data` bind mount and port 3001. |
| `npm audit --omit=dev` | exit 1 | One direct high-severity Hono advisory remains BASE-SEC-001. |
