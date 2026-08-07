# PH-UI-004: Escape Exits Settings While Cancelling A Destructive Confirmation

- Lane: UI/accessibility
- Severity: P2
- Confidence: high
- Status: accepted
- Owner: remediation owner TBD
- Challenger: Codex, Chrome and Electron confirmation challenge
- Verifier: independent verifier recommended
- Affected runtime: both
- Coverage rows: WF-018, WF-021, WF-022, WF-024, RT-008, MOD-002, MOD-005
- Related/duplicate findings: none
- First observed against: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity

## User Impact

When a user opens `Delete User Data` and presses Escape, the confirmation closes
but the app also navigates from Settings to Main Menu. The user loses the current
settings context instead of receiving a local dialog cancel. No reset occurred in
the isolated probe, and the user can reopen Settings, so the defect is P2.

## Expected Behavior Or Oracle

The UI profile requires keyboard Escape and preservation or deliberate discard of
work in progress. Escape in a destructive confirmation should cancel that active
dialog only. A global back shortcut must honor an already-handled modal event.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime/browser: Linux x86_64, Chrome 149 built web runtime and Electron
  30 production renderer under Xvfb.
- Data profile/fixture: isolated fresh profiles; no confirmation action was
  accepted and no user data was reset.

### Reproduction

1. Open Settings > Practice > Delete User Data.
2. Confirm the dialog title is `Delete all user data?` and that Cancel owns focus.
3. Press Escape once.

Both runtimes landed on Main Menu. The expected result is Settings with the
dialog dismissed and focus restored to `Delete User Data`.

### Artifacts

- The confirmation handler calls `preventDefault()` then `onCancel()` at
  `src/renderer/components/SettingsScreen.tsx:448` but does not stop the
  app-wide handler.
- The app-wide `Escape` handler navigates back from Settings at
  `src/renderer/App.tsx:1267` without checking `event.defaultPrevented`.
- The confirmation's focus trap otherwise works at
  `src/renderer/components/SettingsScreen.tsx:464`.
- Screenshot artifact before Escape:
  `/tmp/lumakeys-audit-p5-settings-escape-before.png`, SHA-256
  `635554b2fab12f9d4e9a9fc97ad51635c4940590b8e2a6621b2b75d2375c2407`.
- Full evidence: [Phase 5](../phase-5-ui-accessibility-performance-2026-07-12.md#p5-ui-004-confirmation-escape).

## Root Cause

The modal and app shell both subscribe to `window` keydown. The app-level handler
does not treat `defaultPrevented` as an ownership boundary, so it performs
contextual back navigation before or alongside the dialog cancel behavior.

## Recommended Remediation Boundary

Make global shortcut handling return when `event.defaultPrevented` is true, or
have the active modal stop propagation through a shared modal-keyboard utility.
Add a regression test for every destructive confirmation and for non-modal
Settings Escape navigation.

## Required Regression Proof

- Deterministic unit/integration proof: Escape closes the confirmation, restores
  the trigger, and leaves the Settings tab selected; outside a dialog, Escape
  retains the documented Back behavior.
- Electron proof: delete/reset confirmation behavior passes in a fresh profile.
- Web proof: same in Chrome, Edge, and Firefox.
- Data/recovery proof: Escape causes no reset bridge call, durable mutation, or
  save flush beyond the active settings state.
- Manual hardware/UI proof: keyboard-only user can cancel then continue editing
  the same Settings tab.
- Broader regression command: Settings/App tests, `npm test`, and both builds.

## Challenge Record

- Independent reproduction attempt: [PH-UI-004 challenge](../challenges/PH-UI-004.md).
- Alternative explanations tested: dialog focus/Tab behavior passes; the same
  Escape navigation occurs in web and Electron fresh profiles.
- Scope/severity changes: one global key-dispatch root cause covers progress and
  full-data confirmation dialogs.
- Deduplication decision: distinct from modal focus containment in PH-UI-001.
- Challenger conclusion and date: accepted as P2, 2026-07-12.

## Resolution

- Accepted/rejected rationale: a single Escape has the observable side effect of
  leaving Settings while cancelling the modal in both runtimes.
- Fix branch/commit/issue: not authorized during discovery.
- Verification evidence: pending remediation.
- Residual risk: keyboard users may lose their place in Settings when backing out
  of destructive actions.
- Revisit trigger, if accepted-risk: not applicable.
