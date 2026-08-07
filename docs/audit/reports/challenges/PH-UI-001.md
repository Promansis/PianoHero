# Challenge Record: PH-UI-001

- Challenger: Codex (fresh Chrome and Electron keyboard fixture)
- Date: 2026-07-12
- Baseline identity: charter baseline plus audit patch identity
- Original severity/confidence/status: P2 / high / reproduced

## Claim Under Test

Immersive game, Free Play, and Soundboard session menus falsely claim modal
behavior because keyboard focus can leave them.

## Independent Reproduction

- Fresh setup/fixture: isolated Chrome web profile and isolated Electron Xvfb profile; disposable MIDI only for gameplay.
- Exact steps: open a session menu with Menu/Escape, then press Tab once.
- Result and repeat count: all three web overlays reached background controls; Electron Free Play reached the HUD background control.
- Artifacts: Phase 5 P5-UI-001 evidence and Free Play screenshot hash.

## Alternative Explanations

| Hypothesis | Test | Result |
|---|---|---|
| Environment/dependency failure | Tested working renderer in fresh Chrome and Electron profiles. | Rejected. |
| Fixture or stale-data artifact | Free Play/Soundboard require no song; Gameplay used a fresh MIDI fixture. | Rejected. |
| Intended runtime difference | Compared actual `aria-modal` semantics and Settings' working focus trap. | Rejected. |
| Duplicate root cause | Compared global Escape navigation separately. | Rejected; PH-UI-004 is distinct. |
| Unsupported product condition | Checked ADR 0001 keyboard-only requirement. | Rejected. |

## Calibration

- Actual reach/frequency: every keyboard user opening a tested session menu.
- Recovery and data impact: Escape/Resume recover; no durable mutation.
- Security attacker capability, if relevant: not applicable.
- Music-correctness oracle, if relevant: not applicable.
- Recommended severity/confidence: P2 / high.

## Decision

- accepted
- Canonical finding if duplicate: not applicable
- Required ledger/report changes: add PH-UI-001 and link WF-009, WF-015, WF-016, WF-024, RT-008, MOD-003, MOD-006.
- Challenger signature/date: Codex, 2026-07-12.
