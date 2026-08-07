# Challenge Record: PH-SEC-001

- Challenger: Codex, fresh isolated fixture; no separate reviewer was available
- Date: 2026-07-11
- Baseline identity: 808e6739e55b5186e8a9565f2c4e9267c4894a6c plus chartered patch identity
- Original severity/confidence/status: P0, high, reproduced

## Claim Under Test

An Electron renderer-controlled sample-pack ID can escape the application pack root
and recursively delete a user-writable directory.

## Independent Reproduction

- Fresh setup/fixture: a newly created /tmp root with user-data and sibling victim
  directories only.
- Exact steps: invoke removeDesktopInstrumentSamplePack with ../../victim.
- Result and repeat count: victim directory removed on the fresh fixture; one direct
  end-to-end function reproduction after separate path-normalization confirmation.
- Artifacts: PH-SEC-001 and Phase 2 lane report P2-SEC-001.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Pure local filesystem fixture using production function | Rejected; deletion completed deterministically |
| Fixture or stale-data artifact | Create a new root and sentinel for the probe | Rejected; only current fixture data was touched |
| Intended runtime difference | Compare install validation with removal validation | Rejected; install checks registry ID, removal does not |
| Duplicate root cause | Search sample-pack removal call chain | Rejected; this is the canonical privileged deletion path |
| Unsupported product condition | Check preload/main IPC reachability | Rejected; removal is exposed in the supported Electron runtime |

## Calibration

- Actual reach/frequency: any code running in the Electron renderer can invoke the
  exposed method; normal UI use is not required.
- Recovery and data impact: arbitrary recursive deletion under the desktop user's
  permissions; no app recovery path exists.
- Security attacker capability: XSS, compromised renderer asset, or other renderer
  code execution.
- Recommended severity/confidence: P0, high.

## Decision

- accepted
- Canonical finding if duplicate: PH-SEC-001
- Required ledger/report changes: add P0 finding and link DATA-014, OP-003, OP-006,
  OP-013, and MOD-008.
- Challenger signature/date: Codex, 2026-07-11.
