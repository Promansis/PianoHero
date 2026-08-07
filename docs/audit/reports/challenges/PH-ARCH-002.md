# Challenge Record: PH-ARCH-002

- Challenger: Codex, isolated renderer failure fixture
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

Keyboard Setup reports a new computer-keyboard binding as saved even when its
durable `setSetting` call rejects.

## Independent Reproduction

- Fresh setup/fixture: disposable jsdom renderer harness and in-memory keyboard
  input adapter; no persistent data.
- Exact steps: make `setSetting` reject with `write failed`, begin binding C3,
  send KeyA, then inspect the status message.
- Result and repeat count: one controlled attempt displayed `C3 set to A.` and
  changed the in-memory mapping. The expected persistence-failure message was
  absent.
- Artifacts: [Phase 6 probe evidence](../../evidence/phase-6-probes-2026-07-12.md#keyboard-mapping-write-failure).

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Full suite/typecheck passed; only the bridge write was rejected. | Rejected. |
| Fixture or stale-data artifact | The mapping starts from a deterministic default in memory. | Rejected. |
| Intended session-only setting | Keyboard Setup reloads this mapping from `getSetting` on mount. | Rejected. |
| Duplicate root cause | Compared with PH-DATA-001 and SettingsScreen's managed failure path. | Rejected; this is renderer ownership of one setting-write result. |
| Unsupported product condition | Computer-keyboard configuration is a supported workflow. | Rejected. |

## Calibration

- Actual reach/frequency: any failed durable keyboard mapping write; the same
  fire-and-forget pattern also appears in other renderer setting call sites.
- Recovery and data impact: the live mapping works until the next load, but the
  user is told it succeeded and has no prompt to retry.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-ARCH-002 and link WF-003, WF-018,
  BR-054, MOD-002, and MOD-005.
- Challenger signature/date: Codex, 2026-07-12.
