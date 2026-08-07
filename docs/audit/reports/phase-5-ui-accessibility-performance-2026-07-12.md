# Phase 5: UI, Accessibility, And Performance - 2026-07-12

- Lane owner: Codex (acting)
- Reviewer/challenger: Codex fresh-profile Chrome and Electron challenges; independent verifier pending for P1 remediation
- Baseline identity: `808e6739e55b5186e8a9565f2c4e9267c4894a6c` plus the chartered audit patch identity
- Started: 2026-07-12
- Last updated: 2026-07-12
- Status: complete with one P1 and three P2 accepted UI findings; browser, hardware, and active-audio gaps are explicit

## Scope

- Coverage rows: WF-001, WF-003, WF-007 through WF-009, WF-015, WF-016,
  WF-018, WF-021, WF-022, WF-024, RT-001 through RT-011, MOD-002 through
  MOD-007.
- User journeys: first-run setup, main menu, library-to-game startup, gameplay,
  free play, soundboard, settings, destructive confirmation, and contextual
  navigation.
- Runtimes: built self-hosted web in Chrome 149 and an isolated Electron 30
  renderer under Xvfb. Firefox was attempted but its Snap confinement could not
  create a headless profile; Edge is not installed.
- Explicit exclusions: mobile/touch layouts under ADR 0001, production data,
  remediation, browser-specific Firefox/Edge conclusions without a runnable
  profile, named MIDI hardware, and heard-audio measurement.

## Evidence Plan

| Surface | Oracle/invariant | Method/fixture | Runtime | Artifact |
|---|---|---|---|---|
| Desktop geometry and zoom | Required desktop sizes and 125-200% zoom must retain visible, reachable controls. | Chrome and Electron effective CSS viewports for `1180x780`, `1480x960`, `1920x1080`, and the 125-200% equivalents. | both | P5-RT-001 through P5-RT-006 |
| Keyboard and dialogs | A modal must move focus inside, contain `Tab`, restore focus on close, and `Escape` must cancel only the active dialog. | Keyboard CDP events against game, free-play, soundboard, and settings overlays. | both | P5-UI-001, P5-UI-004 |
| Reduced motion | Non-essential visual motion must stop or be reduced while direct input feedback remains available. | Emulated `prefers-reduced-motion: reduce`, 750 ms canvas-pixel hashes. | both | P5-UI-003 |
| Canvas output | Every tested canvas must have framed, nonblank output and a backing buffer matched to device pixel ratio. | Imported `ode-to-joy.mid`, free-play/soundboard idle scenes, 1x and 2x checks. | both | P5-CAN-001 |
| Performance | Frame cadence, long tasks, startup timing, and bundle output require measured dispositions. | Production web build, local Chrome performance entries, 2.2 s idle free-play trace. | web | P5-PERF-001 |

## Working Flows Confirmed

| Coverage row | Evidence | Conditions/limits | Disposition |
|---|---|---|---|
| WF-001 | Fresh Chrome and Electron profiles rendered first-run setup. Selecting `Skip for now` reached the main menu without a visible error. | Posture selection changes were not exhaustively exercised. | initial screen and recovery path covered; remaining setup controls stay in progress |
| WF-007, WF-008 | A disposable `ode-to-joy.mid` upload reached the web library, then started a playable falling-notes session. | File picker cancellation remains PH-PAR-002; full library organization states were not exhaustively exercised. | positive library-to-game path covered |
| WF-009 | The imported gameplay screen rendered labeled falling notes, a hit line, piano keyboard, and nonblank 2x canvas pixels. | Game session controls retain PH-MUS findings; its session menu has PH-UI-001. | covered with PH-UI-001 and inherited music findings |
| WF-015 | Free play rendered at default desktop size in Chrome and Electron, including a nonblank canvas and piano keyboard. | No physical audio, recording waveform, or export proof was available. Session menu focus and reduced motion fail. | covered with PH-UI-001 and PH-UI-003; audio/export gap remains |
| WF-016 | Soundboard rendered a nonblank canvas and labeled key map in Chrome. | Electron production assets remain PH-PAR-001; audible samples were unavailable. Session menu focus and reduced motion fail. | covered with PH-UI-001, PH-UI-003, and PH-PAR-001 |
| WF-018 | At normal desktop size, Settings tabs use a roving tablist: `ArrowRight` selected and focused Visual with a 3 px visible outline. The destructive confirmation initially focused Cancel and trapped normal `Tab` order. | The required 150-200% zoom states clip every tab, and confirmation `Escape` exits Settings. | covered with PH-UI-002 and PH-UI-004 |
| WF-021, WF-022, WF-024 | Destructive confirmation clearly describes the action and exposes Cancel. | `Escape` from the confirmation navigates to Main Menu instead of only cancelling; active-session menus do not contain focus. | gap with PH-UI-001 and PH-UI-004 |

## Desktop And Canvas Evidence

### P5-RT-001: Layout Conditions

Chrome's main menu had no horizontal overflow or offscreen interactive controls at
`1180x780`, `1480x960`, or `1920x1080`. At effective zoom viewports, it also
had no horizontal overflow at 125% (`1184x768`), 150% (`987x640`), 175%
(`846x549`), or 200% (`740x480`). The 200% main menu uses vertical scrolling
without overlapping controls.

The settings screen is the exception. At the effective 150% viewport in both
Chrome and Electron, `.settings-tab-row` has a 4 px client height while its
tabs have 46 px heights. Its overflow clips the labels and hit areas. The
center of the Visual tab resolves to an Audio content card instead of the tab.
This is PH-UI-002.

`/tmp/lumakeys-audit-p5-main-1180x780.png` was captured at the required
minimum condition. `/tmp/lumakeys-audit-p5-settings-150zoom-effective.png`
has SHA-256
`c7600ffc930a0b3572e95e7a162e9d31c8936a28ce41404d70762fc142c60284`;
the Electron equivalent has SHA-256
`e43787a0f5e99829acb42afdc7c21326259f0d3acd1eefafeab0bea171985fd4`.

### P5-CAN-001: High-DPI, Framing, And Pixels

At a `1480x960` CSS viewport with device pixel ratio 2:

```text
Free Play: css 1480x734, buffer 2960x1468, center pixel [28,33,43,255]
Soundboard: css 1480x734, buffer 2960x1468, center pixel [172,239,164,255]
Gameplay: css 1478x732, buffer 2956x1464, 69 non-background sampled pixels
```

The gameplay screenshot contains framed falling notes, labels, hit line, and
piano keyboard. Its raw artifact is
`/tmp/lumakeys-audit-p5-gameplay-1480x960-dpr2.png`, SHA-256
`3c7d189ad56c919d9ab953e183ab2286210dd93f883f59d3979e37e7d6c4cd49`.
Electron free play also rendered a nonblank `1480x706` 1x canvas in its
isolated Xvfb profile; screenshot SHA-256
`ae11f7e72704c06f958c3c188257fee7ae69550588b11efe79a3509763a121cc`.

### P5-UI-001: Modal Focus

Opening the Free Play, Soundboard, or Gameplay session menu leaves focus on
the launcher or body. The first `Tab` moves into a dimmed background control:

```text
Free Play web: Menu -> Tab -> .free-play-preset-btn (Subtle)
Soundboard web: Menu -> Tab -> .soundboard-key-map-card-select (Toy Whistle)
Gameplay web: Escape -> Tab -> .immersive-hud-tab (HUD)
Free Play Electron: Escape -> Tab -> .immersive-hud-tab (HUD)
```

The Free Play overlay screenshot has SHA-256
`5d16809f2518e797149f553cea30c49b4db790617f4a23df3ae651262724c1d7`.
The overlay advertises `aria-modal="true"` but does not implement the
corresponding focus lifecycle.

### P5-UI-003: Reduced Motion

The DOM-level reduced-motion rule correctly reduces Settings transitions to
`0.01ms`, but both immersive canvases still redraw every animation frame. With
`matchMedia('(prefers-reduced-motion: reduce)').matches === true`, the sampled
pixel hashes changed over 750 ms:

```text
Chrome Free Play: 1585659063 -> 1095833635
Chrome Soundboard: 3605353602 -> 700695514
Electron Free Play: 3882716736 -> 1593986054
```

This is PH-UI-003. The reduced-motion screenshot is retained outside Git at
`/tmp/lumakeys-audit-p5-freeplay-reduced-motion.png`, SHA-256
`ba3798aabffc3b4b17081f34f00f9886440dee7f4e79410391d00d62db4bd072`.

### P5-UI-004: Confirmation Escape

At normal desktop size, `Delete User Data` opens a correctly labelled dialog
and focuses Cancel. Pressing `Escape` then lands at Main Menu in both Chrome
and Electron. The Chrome pre-Escape screenshot is retained at
`/tmp/lumakeys-audit-p5-settings-escape-before.png`, SHA-256
`635554b2fab12f9d4e9a9fc97ad51635c4940590b8e2a6621b2b75d2375c2407`.
No reset call was confirmed in the isolated profile.

## Performance Evidence

- `npm run build:web` passed. Vite warned about one 685.71 kB minified initial
  JavaScript chunk (191.50 kB gzip), but a local Chrome navigation produced
  first contentful paint at 324 ms. The warning alone is not a user-impact
  finding.
- A 2.2 second idle Free Play trace at `1480x960` recorded 111 animation
  frames, 18.33 ms average frame spacing, 33.4 ms maximum spacing, and no new
  `longtask` entries above 50 ms. The headless environment has no usable GPU,
  so this is a bounded idle trace rather than a release-performance claim.
- `npm run build` passed after the native guard selected the Electron ABI. The
  renderer loaded under Xvfb. The known public-asset warnings remain PH-PAR-001.
- The perpetual reduced-motion canvas loops are an accessibility finding,
  PH-UI-003. No separate performance finding is justified by the measured idle
  behavior.

## Findings

| Finding | Why it belongs to this lane | Shared lanes |
|---|---|---|
| [PH-UI-001](findings/PH-UI-001.md) | Immersive dialogs violate keyboard focus containment in core practice surfaces. | Workflows, game, free play, soundboard |
| [PH-UI-002](findings/PH-UI-002.md) | Required desktop zoom makes Settings tab controls visually and pointer inaccessible. | Settings, computer keyboard, sample packs |
| [PH-UI-003](findings/PH-UI-003.md) | Reduced-motion preference does not reach immersive canvas render loops. | Performance, free play, soundboard |
| [PH-UI-004](findings/PH-UI-004.md) | Destructive-confirmation Escape also invokes global contextual back navigation. | Settings, resets, navigation |

## Evidence Gaps

| Coverage row | Missing proof | Why blocked | Owner | Next action |
|---|---|---|---|---|
| RT-002, RT-006 through RT-010 | Current Firefox and Edge desktop interaction/zoom/motion smoke. | Edge is absent; Firefox Snap confinement cannot create a headless profile here. | UI verifier | Run the Phase 5 condition matrix in current stable Firefox and Edge using a clean profile. |
| RT-011, WF-002, WF-009, WF-015 | Named MIDI device permission, selection, disconnect/reconnect, audible latency, and hardware feedback. | No device, driver, or physical audio loopback is available. | Runtime/UI verifier | Follow the Phase 3 named-device plan on Linux and Windows. |
| WF-010 through WF-014, WF-017, WF-019 through WF-023 | Full user-driven default/failure/retry state evidence for results, theory, progress, sample packs, backup, reset recovery, and restart. | The Phase 5 session focused the actual screen/canvas/keyboard conditions and did not authorize destructive reset or full hardware/audio execution. | UI/workflow verifier | Run scripts with isolated data and record each state before final readiness. |
| RT-010 | Human color-contrast and color-vision review of every musical/result state. | Source confirms note labels and alternate palette paths, but no calibrated color-vision review was performed. | Accessibility verifier | Test color-blind mode and contrast with representative scored results. |
| P5-PERF-001 | Active high-intensity visual modes, GPU, memory soak, startup on a packaged artifact, and battery profile. | Headless Xvfb has no representative GPU/audio hardware. | Performance verifier | Trace a named desktop GPU at idle and sustained note input after remediation. |

## Runtime And Failure Coverage

- Electron: production renderer launched in a disposable `--user-data-dir` under
  Xvfb after `node scripts/ensure-native-module.cjs electron`. First-run setup,
  main menu, free play canvas, modal focus leakage, Settings zoom clipping,
  reduced motion, and confirmation Escape were observed. `--no-sandbox` was
  necessary for this container's Electron helper configuration and is not a
  product finding.
- Web: a built server used `/tmp/lumakeys-audit-phase5-data`; Chrome covered
  first run, menu, library fixture upload, gameplay, free play, soundboard,
  settings, desktop geometry, high DPI, keyboard behavior, motion, and idle
  performance.
- Loading/empty/disabled: fresh profiles showed the no-songs main-menu state;
  a disposable MIDI produced the loaded library/game states. Existing PH-PAR-002
  remains the cancellation/loading defect.
- Error/retry/recovery: dialog cancel is PH-UI-004; immersive menu escape is
  available but its focus model is PH-UI-001. No destructive reset was allowed.
- Accessibility or hardware proof: normal Settings roving tab and focus ring
  behavior passed. Modal focus, high zoom, and reduced motion have accepted
  findings; color, hardware, Firefox, and Edge remain explicit gaps.

## Challenge Summary

- Claims disproved or narrowed: default/minimum/large main-menu layouts, normal
  Settings tab keyboard behavior, 1x/2x canvas sizing, nonblank canvas pixels,
  DOM reduced-motion transitions, and idle Chrome responsiveness all passed.
- Duplicates merged: the three immersive session overlays share one missing
  focus-management contract (PH-UI-001). Free Play and Soundboard canvas loops
  share one missing reduced-motion propagation contract (PH-UI-003).
- Severity changes: PH-UI-002 is P1 because 150-200% desktop zoom is explicitly
  required and makes Settings sections pointer inaccessible in both runtimes.
  The remaining defects are recoverable P2 accessibility/navigation failures.
- Environmental failures separated: Firefox Snap profile creation, missing Edge,
  missing MIDI/audio hardware, Xvfb GPU warnings, and the initial Electron ABI
  mismatch were recorded as evidence limitations. None is a product finding.

## Lane Exit Check

- [x] Every assigned condition has evidence and disposition, or an explicit gap.
- [x] Every accepted finding has a detailed report, challenge record, and
  coverage-matrix links.
- [x] The P1 zoom lead was reproduced in fresh Chrome and Electron renderer
  profiles; independent remediation verification remains required.
- [x] Positive desktop, keyboard, canvas, and idle-performance behavior is
  recorded.
- [x] Browser, color, hardware, audio, and sustained-performance gaps are
  explicit.
- [x] The coverage matrix, ledger, charter, and report index are updated.

## Sign-Off

- Lane owner/date: Codex (acting), 2026-07-12
- Challenger/date: Codex fresh-profile Chrome and Electron challenge, 2026-07-12; independent P1 remediation verifier pending
- Audit lead/date: Codex (acting), 2026-07-12
