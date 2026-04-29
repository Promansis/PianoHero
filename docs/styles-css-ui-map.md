# `src/renderer/styles.css` UI Section Map

This document maps the current organization of `src/renderer/styles.css` after the stylesheet reorganization pass. Line numbers are approximate and should be refreshed after future large CSS edits.

## Current Top-Level Order

| Lines | Section | Applies to | Function |
| --- | --- | --- | --- |
| 1-224 | Intro, Theme Tokens And Base Rules | Whole app | File organization note, `:root` defaults, theme overrides, base document styles, form defaults, and root height. |
| 225-412 | App Chrome And Navigation | Whole app chrome | App shell spacing, fixed topbar, home button, breadcrumbs, chrome back button, and mobile topbar rules. |
| 413-692 | Shared Primitives | Whole app | Panel surfaces, shared typography, buttons, status cards, layout grids, focus-visible styles, and shared animations. |
| 693-744 | Shared Tags | Library/tag UI | Tag chip rows, chip editor, chip buttons, and removable/clickable tag states. |
| 745-831 | Shared Toasts And Notifications | App-level toasts | Achievement/goal toasts, toast host, success/warn/error variants, and mobile toast layout. |
| 832-845 | Shared Loading And Inline Feedback | Loading components | Loading spinner and inline loading panel layout. |
| 846-1096 | Shared Piano Keyboard | `PianoKeyboard` and keyboard wrappers | Keyboard shell, stage, white/black keys, captions, active/highlight/cue states, finger labels, and keyboard size variants. |
| 1097-1169 | Shared Fingering Editor | `FingeringEditor` | Popup shell, header, finger button row, and immersive/mobile placement behavior. |
| 1170-1690 | Shared Immersive HUD And Overlay | `ImmersiveHud`, immersive shells | Immersive app shell, hover HUD, stats, nav buttons, instrument popout, canvas area, countdown, overlays, responsive HUD, and reduced-motion handling. |
| 1691-2624 | Main Menu Page | `MainMenuScreen` | Cinematic main menu tokens, background, topbar override, hero, status rows, card grid, card hover/popover effects, menu animations, and responsive/reduced-motion rules. |
| 2625-2809 | Game Session Page | `GameScreen`, falling notes, session controls | Canvas shell, labels, track panel, session toolbar, loop controls, reminder overlay, fingering hint bar, and responsive session layout. |
| 2810-3273 | Library Page | `LibraryScreen`, sidebar, filters, playlists | Library shell/layout, import progress, sidebar, search/filter bar, song cards, metadata actions, playlists, difficulty badges, saved presets, maintenance panels, and responsive library rules. |
| 3274-3703 | Results Page | `ResultsScreen` | Results shell, confetti, hero, grade badge, score cards, timing cards, performance graph, trouble spots, feedback, practice routine, and mobile result stacking. |
| 3704-3910 | Theory, Interval, And Scale Practice Pages | Theory hub, quiz, interval trainer, scale practice | Theory shells/cards, scale fingering rows, settings/question/review panels, note staff, choice buttons, suggestions, key signature/staff SVGs, and responsive theory grids. |
| 3911-4244 | Free Play Page | `FreePlayScreen`, visualizer | Free-play immersive background, HUD overrides, stage, visualizer copy/badges/canvas, visual popout, preset buttons, mode cards, slider cards, summary/BPM cards, and responsive popout placement. |
| 4245-4609 | Novelty Soundboard Page | `NoveltySoundboardScreen`, animal canvas | Soundboard and animal immersive backgrounds, HUD overrides, canvas stage, map popout, emoji keyboard labels, overlay sections, mode/clip cards, credits, keyboard pop effects, and mobile soundboard rules. |
| 4610-4667 | Setup Guide Page | `SetupGuideScreen` | Setup shell, hero, action/grid/footer layout, setup cards, diagram SVGs, and mobile stacking. |
| 4668-4870 | Keyboard Setup Page | `KeyboardSetupScreen` | Setup hero, mode panel, mapping board, bindable key states, binding cards, code labels, and responsive control grids. |
| 4871-5367 | Progress Dashboard And Achievements | Progress dashboard, charts, recommendations | Dashboard panels, recommendations, chart grids, stat cards, hit-quality bar, top songs, global trouble spots, streak/milestone/achievement cards, daily goal, skeleton loading, progress hero, and responsive dashboard grids. |
| 5368-5607 | Settings Page | `SettingsScreen`, `LatencyWizard` | Settings layout/tabs, notes/danger zone, confirmation rows, latency wizard, keyboard size preview, settings groups, and mobile settings layout. |
| 5608-5905 | Learn Hub And Lesson Pages | `LearnHubScreen`, `LessonScreen` | Learn hub controls/summary, tier and lesson cards, capstone cards, progress bars, lesson hero/layout/stepper, step cards, lesson diagrams, embedded keyboard labels, and responsive lesson layout. |

## Theme Preparation Notes

- Existing global theme variables remain centralized in `:root` and `[data-theme]` blocks.
- Page-specific visual variables that already exist, such as the main menu neon variables, now live with their owning page section.
- The current pass intentionally avoided broad variable replacement. Future theme expansion can add screen-level tokens inside each page section, then override those tokens from the centralized theme blocks.

## Main Menu Cleanup Notes

- The cinematic Main Menu block is now the canonical Main Menu styling.
- Earlier pre-cinematic Main Menu declarations were removed where they were superseded by the cinematic block.
- The WebP/PNG `image-set()` background fallback remains in both desktop and mobile Main Menu backgrounds.

## Responsive Organization Notes

- Mixed global media blocks were split so responsive rules sit under the shared component or page section they affect.
- Existing breakpoints were preserved: `1180px`, `980px`, `780px`, the compact-height query, the touch/hover query, and reduced-motion query.

## Future Refactor Guidance

1. Add new shared styles to the shared primitive/component sections before creating page-specific overrides.
2. Add new page styles only under the matching page section.
3. Keep responsive rules immediately after the styles they override.
4. Prefer theme tokens for new color, shadow, and background decisions.
5. Avoid reintroducing duplicate page blocks at the end of the file; add to the existing section instead.
