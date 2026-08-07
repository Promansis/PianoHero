# PH-LANE-NNN: Short Finding Title

- Lane:
- Severity: P0 | P1 | P2 | P3
- Confidence: low | medium | high
- Status: suspected | reproduced | accepted | fixed | verified | rejected | duplicate | accepted-risk
- Owner:
- Challenger:
- Verifier:
- Affected runtime: Electron | web | both | runtime-independent
- Coverage rows:
- Related/duplicate findings:
- First observed against:

## User Impact

Describe who is affected, what task or data is at risk, frequency/reach, recovery,
and why the severity follows from those facts.

## Expected Behavior Or Oracle

State the product requirement, music rule, security invariant, data invariant,
runtime parity expectation, design criterion, or operational requirement used to
judge the result. Link its source.

## Evidence

### Environment

- Commit/patch identity:
- OS/runtime/browser:
- Data profile/fixture:
- Hardware, if applicable:

### Reproduction

1. Exact setup and initial state.
2. Exact action or command.
3. Exact observed result.
4. Repeat count and consistency.

### Artifacts

- File/line or contract evidence:
- Test/command output summary:
- Screenshot/video/trace path and hash:
- Durable-state before/after comparison:

## Root Cause

Name the violated invariant and owning boundary. Do not restate the symptom. If root
cause is not yet demonstrated, keep the finding `suspected` or `reproduced` and list
the next diagnostic evidence required.

## Recommended Remediation Boundary

Describe the smallest vertical behavior change and likely owning modules. This is not
implementation authorization.

## Required Regression Proof

- Deterministic unit/integration proof:
- Electron proof:
- Web proof:
- Data/recovery proof:
- Manual hardware/UI proof:
- Broader regression command:

## Challenge Record

- Independent reproduction attempt:
- Alternative explanations tested:
- Scope/severity changes:
- Deduplication decision:
- Challenger conclusion and date:

## Resolution

- Accepted/rejected rationale:
- Fix branch/commit/issue:
- Verification evidence:
- Residual risk:
- Revisit trigger, if accepted-risk:
