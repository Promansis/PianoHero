# LumaKeys UI Audit Profile

Apply this profile whenever a general UI/a11y audit workflow is used for LumaKeys.
`PRODUCT.md` and `DESIGN.md` are acceptance criteria. ADR 0001 overrides generic
mobile guidance.

## Excluded

- Phone and tablet viewports.
- Touch-first navigation.
- Mobile breakpoint completeness.
- Mobile network, battery, or device optimization.

Do not create findings for excluded conditions.

## Required Desktop Conditions

- Supported minimum desktop window once confirmed.
- Default 1480x960 and confirmed large desktop window.
- 100%, 125%, 150%, 175%, and 200% zoom.
- 1x and available high-DPI output.
- Pointer and keyboard-only operation.
- Default and reduced-motion preference.
- Computer keyboard and available MIDI hardware.
- Electron and supported desktop browsers.

## Workflow Checks

For every applicable workflow verify default, hover, focus-visible, active, selected,
disabled, loading, empty, success, warning, error, retry, and destructive-confirmation
states. Verify contextual back behavior and preservation or deliberate discard of
work in progress.

Prioritize:

- Readability from a playing posture with hands away from mouse/keyboard.
- MIDI permission, selection, disconnect, reconnect, and fallback guidance.
- No color-only distinction for note, hand, timing, answer, or result state.
- Focus order, focus restoration, semantics, names, values, and keyboard escape.
- Text/control containment at desktop zoom without overlap or hidden actions.
- Reduced motion without removing essential status feedback.
- Clear error, destructive consequence, recovery, and save state.
- Consistency between `DESIGN.md` tokens/rules and actual CSS usage.

## Canvas Proof

For gameplay, free play, soundboard, and other canvas surfaces capture:

- Screenshot at the tested window, zoom, and pixel density.
- Canvas CSS size and backing-buffer dimensions.
- A nonblank pixel check after expected render time.
- Critical content bounds proving it is framed and unobscured.
- Animation/frame-time evidence for a defined workload.
- Reduced-motion behavior and input feedback.

A mounted canvas element or nonzero dimensions alone is not render proof.

## CSS Ownership

Treat `src/renderer/styles.css` as an ownership investigation. Map selectors to
shared tokens, shells, components, and pages before proposing a split. File length is
not a finding; duplicated rules, conflicting ownership, dead selectors, unsafe
cascade, or measurable change risk may be.

## Evidence Format

Each UI finding records workflow, runtime, window, zoom, DPI, input method, motion
setting, exact state, screenshot/pixel artifact, semantic evidence, user impact, and
the relevant `PRODUCT.md`/`DESIGN.md` criterion.
