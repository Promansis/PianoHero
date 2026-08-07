# Challenge Record: PH-PAR-001

- Challenger: Codex (fresh build and runtime fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P1 / high / reproduced

## Claim Under Test

Electron production output lacks static public assets required by curriculum and managed sample-pack operations, while the web output contains them.

## Independent Reproduction

- Fresh setup/fixture: regenerated `out/` with `npm run build`; isolated Electron user-data profile; Chrome/web comparison.
- Exact steps: inspect fresh output, invoke Electron `loadCurriculumMidi('ode-to-joy.mid')`, then invoke the web method.
- Result and repeat count: fresh Electron build omitted the directory and the bridge returned ENOENT; web returned 614 bytes. Repeated once after the fresh build.
- Artifacts: Phase 4 P4-PAR-001 output and command record.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Fresh `npm run build` completed successfully. | Rejected; missing files/warnings remain after a clean renderer build. |
| Fixture or stale-data artifact | Compared the fresh output to the web asset served from `public/`. | Rejected; web succeeds with the same valid file. |
| Intended runtime difference | Reviewed bridge contract and capstone flow. | Rejected; no Electron-only UI disposition exists and capstone catch only logs an error. |
| Duplicate root cause | Compared with PH-DATA/PH-SEC records. | Rejected; this is renderer asset assembly, not storage mutation or deletion. |
| Unsupported product condition | Checked ADR 0001 and charter. | Rejected; Electron desktop is supported. |

## Calibration

- Actual reach/frequency: every Electron production build; every capstone invocation is affected.
- Recovery and data impact: no data loss, but core learning progression is blocked.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P1 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-PAR-001 and link BR-060, BR-067, WF-011, WF-016, WF-019, OP-006, MOD-012.
- Challenger signature/date: Codex, 2026-07-12.
