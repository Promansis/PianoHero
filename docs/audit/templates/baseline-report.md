# Baseline Report: YYYY-MM-DD

## Identity

- Source branch/worktree:
- Commit SHA:
- Dirty patch identity or `clean`:
- OS/architecture:
- Node/npm versions:
- Electron version:
- Browser versions:
- MIDI/audio hardware:
- Isolated data directory: `/tmp/...`

## Dependency Health

- Install method and lockfile state:
- Native binary checks (`esbuild`, `better-sqlite3`):
- Dependency repair performed before this baseline:
- Files changed by repair:

Do not silently repair dependencies while capturing the baseline. Record the broken
state first, repair it as environment preparation, then start a new baseline.

## Automated Baseline

| Check | Exact command | Result | Duration | Evidence/summary |
|---|---|---|---:|---|
| Typecheck | `npm run typecheck` | TBD | TBD | TBD |
| Tests | `npm test` | TBD | TBD | TBD |
| Desktop build | `npm run build` | TBD | TBD | TBD |
| Web build | `npm run build:web` | TBD | TBD | TBD |
| Package audit | `npm audit` | TBD | TBD | TBD |

For a known invalid install, use a lockfile-preserving reinstall appropriate to the
environment, then record the exact command and resulting lockfile diff. Do not update
dependency versions as part of baseline repair.

## Startup Smoke

### Electron

- Exact command/profile:
- Window rendered:
- Main menu interaction:
- Clean shutdown:
- Console/main-process errors:
- Evidence:

### Web

- Exact server/client command:
- `LUMAKEYS_DATA_DIR`:
- URL and browser:
- Main menu interaction:
- Clean shutdown:
- Browser/server errors:
- Evidence:

## Known Baseline Failures

| ID | Failure | Environmental or product lead | Reproduction | Audit effect | Owner |
|---|---|---|---|---|---|
| _None recorded._ | | | | | |

## Baseline Decision

- Suitable for audit evidence: yes/no
- Exceptions and confidence impact:
- Approved by:
- Date:
