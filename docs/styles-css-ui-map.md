# `src/renderer/styles.css` UI Section Map

This document groups the current `styles.css` file by the pages and UI areas that the rules apply to. Line numbers refer to the current file at the time this map was created.

The stylesheet is currently partly chronological and partly override-based. Some pages, especially Main Menu, App Chrome, Free Play, Library, Progress, Settings, and Lessons, have rules split across multiple distant ranges.

## Cross-App Foundation

### Theme Tokens And Base Page Setup

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1-50 | `:root` | Default theme variables: fonts, text colors, borders, accents, panel colors, keyboard colors, chart colors, result quality colors, and page background tokens. |
| 51-82 | `[data-theme="warm"]` | Warm theme overrides for shared color variables. |
| 83-123 | `[data-theme="dark"]` | Dark theme overrides, including keyboard, charts, panels, and page background tokens. |
| 124-178 | `[data-theme="neon"]` | Neon dark theme overrides, including bright accent colors and darker keyboard/chart surfaces. |
| 180-203 | `*`, `body`, `button`, `input`, `select` | Global box sizing, body background, inherited form fonts, input/select styling, placeholder color, and focus outline. |
| 205-217 | `#root`, `.app-frame`, `.app-shell`, `.app-shell-without-chrome` | Root height and default app shell spacing/grid layout. |

### App Chrome And Navigation

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1108-1155 | `.app-topbar`, `.app-topbar-brand`, `.app-topbar-title`, `.app-topbar-actions`, `.chrome-back-button` | Original fixed topbar layout and back-button sizing. |
| 4562-4631 | `.app-shell`, `.app-topbar`, `.app-topbar-home`, `.app-breadcrumbs`, `.app-breadcrumb*`, `.app-topbar-actions` | Later topbar rewrite adding home button, breadcrumb layout, grid areas, and revised shell top padding. |
| 4095-4134 | Mobile topbar and toast overrides | Earlier mobile rules for topbar stacking, toast layout, and shell padding. |
| 5091-5214 | Mobile topbar, shell, and shared responsive overrides | Later mobile rules that override app shell padding, topbar grid areas, breadcrumbs, and several page grids. |
| 5222-5244 | `.app-frame:has(.main-menu-screen) .app-topbar*` | Main-menu-specific topbar theme override for the cinematic menu. |
| 764-767 | `.app-frame:has(.soundboard-screen.app-shell-immersive) .app-topbar` | Hides the topbar for immersive soundboard mode. |

### Shared Panels, Buttons, Text, And Layout Primitives

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1332-1387 | `.panel`, common panel groups, `.control-row`, `.panel-heading`, headings | Shared panel styling, rounded panel containers, flex row primitives, and heading typography. |
| 1420-1436 | `.song-title`, `.panel-copy`, `.empty-state`, `.eyebrow` | Shared descriptive text, empty state copy, and uppercase eyebrow labels. |
| 1443-1496 | `.primary-button`, `.secondary-button`, `.danger-button`, disabled and hover states | Shared button styles and hover/disabled behavior. |
| 1497-1564 | `.control-grid`, cards, `.status-strip`, `.status-card`, shared statistic labels | Shared grid/card patterns for controls, stats, and status panels. |
| 1565-1575 | `.workspace-grid`, `.results-grid` | Shared two-column layout for gameplay/results-style views. |
| 2487-2552 | First responsive block | Collapses shared grids, results layouts, library layout, search bar, timing breakdown, song stats, and theory grids. |
| 2553-2660 | `.session-toolbar`, `.metadata-editor`, `.feedback-panel`, action rows, tag rows | Shared session controls, metadata editing, loop controls, song action groups, and inline tag display. |
| 3737-3797 | `.achievement-toast`, `.toast-host`, toast variants | Fixed toast/achievement notification layout and success/warn/error visual variants. |
| 3798-3882 | `.loading-spinner`, `.maestro-banner`, inline loading, notation feedback, trouble spot resolved | Shared loading, celebration, notation exercise, and resolved trouble spot styling. |
| 3883-3927 | `@keyframes fadeIn`, `badgeReveal`, `menuCardIn`, `spin` | Shared animations used across shells, cards, badges, and spinners. |
| 5032-5057 | Shared focus-visible selectors and `recommendationSkeletonShift` | Global keyboard focus outline for interactive page elements plus recommendation skeleton animation. |

## Main Menu Page

Component: `src/renderer/components/MainMenuScreen.tsx`

The main menu has three layers of styles. The final cinematic block starting at line 5215 overrides much of the earlier main-menu styling.

### Original Menu Layout

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1156-1245 | `.main-menu-screen`, `.main-menu-hero*` | Original menu shell, hero section, hero title, subtitle, and compact status panel. |
| 1246-1331 | `.main-menu-grid`, `.menu-card*` | Original card grid, menu card visuals, icons, titles, subtitles, and hover treatment. |

### Later Menu Structure Overrides

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 4562-4565 | `.app-shell` | Raises default app shell padding; affects main menu and other chrome pages. |
| 4632-4700 | `.main-menu-screen`, `.menu-card-primary`, `.main-menu-secondary-*`, `.menu-card-secondary` | Adds primary/secondary card sizing, secondary section shell, secondary heading layout, and secondary grid. |

### Cinematic Menu Refresh

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 5215-5221 | `@property --glow-angle` | Registers animated conic-gradient angle for card glow borders. |
| 5222-5244 | Main-menu topbar overrides | Recolors topbar and breadcrumbs while the main menu is active. |
| 5246-5299 | `.main-menu-screen`, `::before`, `::after` | Final menu page background: image, neon variables, overlay gradients, mouse-position parallax effects. |
| 5301-5364 | `.main-menu-backdrop`, `.main-menu-light*`, `.main-menu-facet*`, `.main-menu-score-lines` | Decorative animated/positioned background layers behind menu content. |
| 5383-5522 | `.main-menu-hero*`, `.main-menu-status-*` | Final hero layout, title gradient, subtitle, status card, status rows, and hidden meter structure. |
| 5524-5568 | `.main-menu-grid`, `.main-menu-secondary-*` | Final grid widths, columns, spacing, and secondary menu section layout. |
| 5570-5860 | `.menu-card*`, `.entrance-animate` | Final 3D/neon card system: tilt variables, glow border, sheen, hover state, primary/secondary card sizing, icons, popovers, and focus state. |
| 5865-5909 | `heroEntrance`, `heroTitleShimmer`, `menuGlowSpin`, `mainMenuMeterPulse` | Menu-only entrance, title shimmer, glow spin, and status meter animation. |
| 5911-6144 | Main-menu media queries and reduced motion | Desktop height tweaks, tablet/mobile grid changes, touch-device hover removal, and reduced-motion behavior. |

## Gameplay / Song Session Page

Components: `GameScreen.tsx`, `FallingNotesCanvas.tsx`, `FingeringEditor.tsx`, `TrackAssignmentPanel.tsx`, `ImmersiveHud.tsx`

### Immersive Game Shell

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 221-231 | `.app-shell-immersive` | Full-viewport gameplay shell with no normal app padding. |
| 232-431 | `.immersive-hud*`, `.immersive-menu-btn`, `.immersive-control-wrap` | Hover/pinned HUD shell, stats, nav buttons, action buttons, combo animation, and accuracy coloring. |
| 435-475 | Immersive HUD mobile query | Converts HUD to horizontal scroll and adjusts stat sizing. |
| 477-562 | `.immersive-instrument-*` | Instrument selector button, popout, option grid, active/disabled states, and copy styling. |
| 563-628 | `.immersive-canvas-area`, `.countdown-*`, `.immersive-keyboard*` | Full-height canvas area, countdown overlay animation, immersive keyboard integration, and flattened keyboard chrome. |
| 629-690 | `.reminder-overlay`, `.immersive-overlay*` | Immersive reminder position and modal overlay/panel/action layout. |

### Standard Session Controls And Canvas

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1332-1387 | `.control-bar`, `.control-row`, headings | Top session control panel and shared panel headings. |
| 1497-1518 | `.control-grid`, `.tempo-card`, `.progress-card` | Tempo/progress control layout. |
| 1576-1608 | `.canvas-shell`, `.canvas-labels`, canvas sizing | Falling notes canvas shell, drag/drop outline, labels, and canvas sizing. |
| 1609-1640 | `.track-panel`, `.track-list`, `.track-row` | Track assignment panel layout and select rows. |
| 2553-2626 | `.session-toolbar`, `.session-chip-group`, `.loop-*` | Practice/session toolbar, chip groups, loop picker, loop measure inputs, and loop total text. |
| 3987-3999 | `.fingering-hint-bar` | Fingering guidance bar above relevant practice views. |

### Fingering Editor

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 2116-2142 | `.fingering-editor-*` | Positioned fingering popup, header layout, and finger button row. |

## Shared Piano Keyboard

Components: `PianoKeyboard.tsx`, `KeyboardSetupScreen.tsx`, `LessonDiagram.tsx`, soundboard/free-play keyboard wrappers

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1609-1649 | `.keyboard-shell`, `.keyboard-stage`, `.chord-label` | Standard piano keyboard panel, stage background, height, and chord label. |
| 1665-1739 | `.white-keys`, `.white-key`, `.black-keys`, `.black-key`, `.key-caption`, active states | White/black key layout, labels, active key gradients, and glow. |
| 1740-1796 | `.scale-highlight`, `.chord-highlight`, `.cue-*` | Scale/chord highlighting and hand/fingering cue overlays. |
| 1797-1841 | `.key-finger*` | Finger number placement and priority coloring for white/black keys. |
| 2820-2849 | `.keyboard-overlay-layer`, `.keyboard-overlay-effect*` | Floating soundboard visual overlays that originate from played keys. |
| 4087-4093 | `.keyboard-shell.keyboard-size-* .keyboard-stage` | Small and large keyboard height variants. |
| 4455-4479 | `.lesson-keyboard-diagram*`, `.lesson-keyboard-label*` | Embeds the shared keyboard in lesson diagrams and adds absolute-positioned labels. |
| 5011-5031 | `.key-caption.custom`, `.black-key .key-caption` | Later label wrapping override to prevent custom key labels from overflowing. |

## Library Page

Components: `LibraryScreen.tsx`, `LibrarySidebar.tsx`, `AdvancedFilters.tsx`, `BulkActionBar.tsx`, `TagChips.tsx`, `PlaylistView.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1373-1418 | `.library-header`, `.import-progress*` | Library page header and MIDI import progress indicator. |
| 1843-1879 | `.library-screen`, `.library-layout`, `.library-content`, `.library-sidebar` | Main library page grid, content column, and sticky sidebar panel. |
| 1879-1916 | `.sidebar-*`, `.library-selection-row`, sidebar shared flex groups | Sidebar section/list layout, create rows, and button/input sizing. |
| 1916-1939 | `.search-bar`, `.filter-chips`, `.filter-preset-label` | Search and filter bar grid plus filter chip row. |
| 1935-2019 | `.song-grid`, `.song-list`, `.song-card*`, `.song-goal-row`, `.favorite-toggle` | Library song grid/list, song card hover, title truncation containers, stats, goal row, and favorite toggle. |
| 2024-2054 | `.playlist-list`, `.advanced-filters-grid`, `.bulk-action-*`, `.tag-filter-summary` | Playlist list, advanced filter grid, and bulk action controls. |
| 2055-2102 | `.tag-chip*` | Reusable tag chip row/editor/suggestion/remove button styling. |
| 2102-2115 | `.playlist-row*` | Playlist row layout and playlist metadata column. |
| 2142-2172 | `.difficulty-badge`, `.difficulty-*` | Difficulty badge base and easy/medium/hard color bands. |
| 2647-2660 | `.song-tag-row`, `.song-tag` | Read-only song tag display inside song cards. |
| 3999-4033 | `.user-preset-*`, `.preset-name-input` | User-saved filter preset chip, delete button, save button, and preset name input. |
| 4738-4767 | `.library-collection-summary`, `.library-mobile-collections`, `.library-sidebar-embedded`, `.song-card-title/artist/folder` | Later library collection summary, mobile sidebar embedding, and song text truncation. |
| 4767-4772 | `.song-card-more-actions` | Two-column layout for extra song card actions. |
| 4802-4806 | `.library-maintenance-body` | Maintenance panel internal grid. |

## Results Page

Component: `ResultsScreen.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1843-1856 | `.results-screen`, `.confetti-canvas` | Results shell and full-page celebration canvas. |
| 2173-2209 | `.results-hero`, `.grade-badge`, `.grade-*` | Results hero row, grade badge sizing/animation, and grade color variants. |
| 2210-2239 | `.score-display`, `.star-rating`, `.results-summary`, `.result-stat` | Score card, star rating, summary stat blocks. |
| 2240-2259 | `.timing-breakdown`, `.timing-card.*` | Perfect/good/ok/miss timing cards and quality color bars. |
| 2260-2270 | `.performance-graph-shell`, `.performance-graph-canvas` | Results performance graph panel and canvas background. |
| 2271-2298 | `.trouble-spots`, `.trouble-spot-list*`, `.results-actions` | Trouble spot panel, list rows, and final action row. |
| 2553-2567 | `.feedback-panel`, `.compact-strip` | Actionable feedback panel and compact strip adjustment. |
| 4035-4086 | `.practice-routine-*`, `.step-*` | Practice routine panel, ordered step cards, step number badge, and action alignment. |

## Theory, Interval, And Scale Practice Pages

Components: `TheoryHubScreen.tsx`, `TheoryQuizScreen.tsx`, `IntervalTrainerScreen.tsx`, `ScalePracticeScreen.tsx`, `NotationReadingExercise.tsx`, `KeySignatureBadge.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 2019-2023 | `.theory-screen-hero` | Early theory hero hook. |
| 2298-2367 | `.theory-hub-screen`, `.theory-practice-screen`, `.scale-fingering-*`, `.fingering-*` | Theory/practice page shell and scale fingering display rows/cells. |
| 2368-2397 | `.theory-card-grid`, `.theory-card`, `.theory-card-stats` | Theory hub card grid and stat formatting. |
| 2397-2435 | `.theory-settings-panel`, `.theory-screen-hero`, `.theory-question-panel`, `.theory-choice-*`, `.note-staff-*` | Quiz/trainer settings, question panels, choice grid/buttons, and staff SVG container. |
| 2435-2470 | `.theory-suggestion-*`, `.theory-review-list`, `.review-*` | Theory suggestions and quiz review list with correct/incorrect color states. |
| 2471-2480 | `.key-signature-badge` | Key signature badge copy layout. |
| 3860-3878 | `.notation-reading-exercise`, `.notation-answer-row`, `.notation-feedback-*` | Notation reading exercise SVG color, answer row, and feedback colors. |
| 3953-3958 | `.key-staff-svg` | Mini-staff SVG placement for key signatures. |

## Free Play Page

Components: `FreePlayScreen.tsx`, `FreePlayVisualizer.tsx`, `FreePlayCanvasScene.tsx`, `ImmersiveHud.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 691-755 | `.free-play-immersive-shell`, `.free-play-hud*`, `.free-play-stage-area`, `.free-play-keyboard`, `.free-play-visualizer*` | Immersive free-play background, HUD styling, stage area, keyboard surface, visualizer overlay copy, and badge area. |
| 927-1007 | `.free-play-visualizer-copy*`, `.free-play-visualizer-badge*`, `.free-play-visualizer-scene`, `.free-play-scene-canvas`, `.free-play-overlay-panel`, `.free-play-visual-popout`, `.free-play-overlay-section` | Visualizer title/copy, badge chips, full-canvas scene, visualizer settings popout, and overlay panel. |
| 1008-1107 | `.free-play-mode-grid`, `.free-play-preset-*`, `.free-play-mode-card*`, `.free-play-overlay-grid`, `.free-play-slider-card` | Visual mode selector, preset row/buttons, locked/active mode cards, slider cards. |
| 2553-2567 | `.free-play-summary` in shared session group | Adds free-play summary into shared grid grouping. |
| 2891-2908 | `.free-play-summary`, `.free-play-bpm-card*` | Free-play stat summary grid and BPM card label/value formatting. |
| 2911-3008 | Free-play responsive rules | Collapses summary and overlay grids, moves visualizer controls/popouts for mobile. |
| 4908-4929 | `.free-play-hud*`, `.free-play-stage-palette-heading` | Later HUD stat truncation and visual stage palette heading separator. |
| 5197-5206 | `.free-play-visual-popout`, `.free-play-preset-row` mobile override | Later mobile popout sizing and preset wrapping. |

## Novelty Soundboard Page

Component: `NoveltySoundboardScreen.tsx`, `AnimalSoundboardCanvas.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 756-808 | `.animal-soundboard-shell`, `.animal-soundboard-hud*`, `.animal-map-toggle`, `.animal-soundboard-stage`, `.animal-soundboard-canvas*`, `.soundboard-screen.app-shell-immersive` | Animal soundboard immersive background, HUD color overrides, map toggle, stage/canvas positioning, and stretch behavior. |
| 812-879 | `.animal-soundboard-map-popout*`, `.animal-soundboard-keyboard*` | Floating animal key map popout and emoji keyboard label overrides. |
| 880-926 | `.soundboard-overlay-*` | Soundboard overlay panel, sections, grids, credits panel reset, and status card grid overrides. |
| 2660-2685 | `.soundboard-screen`, `.soundboard-hero`, `.soundboard-grid`, `.soundboard-mode-grid` | Non-immersive soundboard screen hooks, hero layout, clip grid, and mode grid. |
| 2686-2738 | `.soundboard-mode-card*`, `.soundboard-summary*` | Soundboard mode cards and summary stat formatting. |
| 2738-2796 | `.soundboard-hero-actions`, `.soundboard-clip-card*`, `.soundboard-shortcut`, `.soundboard-credits-panel` | Hero action row, clip cards, shortcut badge, and credits panel shell. |
| 2797-2819 | `.soundboard-credits-list`, `.soundboard-credit-item*` | Credits grid and credit item text/link styling. |
| 2820-2864 | `.keyboard-overlay-*`, `soundboard-pop-float` | Floating image effects emitted from keyboard presses. |
| 2929-3008 | Soundboard mobile rules | Mobile hero/footer stacking, map popout relocation, visual popout behavior, and legacy animal credit/emoji sizing hooks. |

## Setup Guide Page

Component: `SetupGuideScreen.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 2553-2567 | `.setup-footer`, `.setup-actions`, `.setup-grid` in shared group | Adds setup actions/grid/footer into shared layout declarations. |
| 2660-2674 | `.setup-screen`, `.setup-hero` | Setup page shell and hero panel layout. |
| 2866-2880 | `.setup-grid`, `.setup-card`, `.setup-footer` | Setup checklist grid, card shape, and footer alignment. |
| 3942-3951 | `.setup-diagram-svg` | Setup diagram SVG sizing, centering, and color. |

## Keyboard Setup Page

Component: `KeyboardSetupScreen.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 3009-3037 | `.keyboard-setup-screen`, `.keyboard-setup-hero`, `.keyboard-mode-panel` | Keyboard setup shell, hero panel, and mode selector panel. |
| 3038-3058 | `.keyboard-mode-meta*`, `.keyboard-mapping-grid`, `.keyboard-control-grid` | Mode metadata and control/binding grid setup. |
| 3060-3091 | `.keyboard-mapping-scroller`, `.keyboard-mapping-board`, `.keyboard-binding-stage`, `.keyboard-binding-white/black-keys` | Horizontal keyboard mapping board and key row positioning. |
| 3092-3126 | `.keyboard-bind-card*`, `.keyboard-selected-bind-card`, `.keyboard-bind-status`, `.keyboard-bind-key` | Binding cards, selected binding detail card, status copy, and key button reset. |
| 3139-3178 | `.keyboard-binding-white-key`, `.keyboard-binding-black-key`, active/selected/capturing/unbound states | Bindable key visuals and state styling. |
| 3179-3212 | `.keyboard-bind-note`, `.keyboard-bind-code` | Absolute note/code labels on bindable keys. |
| 3213-3240 | `.status-card .secondary-button`, keyboard setup responsive queries | Button spacing inside status cards and responsive control-grid collapse. |

## Progress Dashboard, Recommendations, And Achievements

Components: `ProgressDashboardScreen.tsx`, charts under `src/renderer/components/charts`, `AchievementToast.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 3241-3296 | `.recommendations-section`, `.chart-panel`, `.dashboard-stat-card`, `.recommendation-*`, `.achievement-card`, `.settings-note-card` | Shared dashboard panel/card surfaces, recommendation groups, carousel, and dashboard stat grid. |
| 3296-3323 | Dashboard/stat typography | Shared label/value typography for stats, streak values, note cards, learn summary, and lesson metadata. |
| 3347-3358 | `.dashboard-chart-grid`, `.dashboard-meta-grid` | Dashboard chart grid variants and metadata grid. |
| 3359-3409 | `.hit-quality-*` | Hit quality bar, segments, legend, and dots. |
| 3410-3458 | `.top-songs-*` | Top songs list rows, rank/title/plays/accuracy columns. |
| 3459-3522 | `.trouble-spots-global-*` | Global trouble spots list layout and stat formatting. |
| 3523-3580 | `.week-comparison-*`, `.chart-canvas`, `.streak-*`, `.maestro-title-badge`, `.milestone-badge` | Week comparison grid, chart sizing, streak values/badges, title badge, and milestone badges. |
| 3581-3606 | `.achievement-grid`, `.achievement-card.unlocked`, `.achievement-card-icon` | Achievement grid, unlocked state, and achievement icon. |
| 3929-3941 | Dashboard responsive block | Collapses recommendation carousel, chart grids, stat grid, settings layout/grid, dashboard meta grid, and main menu grid. |
| 4773-4801 | `.recommendation-card-skeleton`, `.recommendation-skeleton-*` | Loading skeleton cards/lines for recommendations. |
| 4807-4908 | `.progress-hero-*`, `.progress-primary-chart-grid`, `.progress-inline-empty`, `.progress-secondary-grid` | Progress dashboard hero, highlight metric, hero stat cards, primary/secondary chart grids, and empty state actions. |
| 5058-5090 | Progress responsive block | Collapses progress chart grids, hero cards, hero stats, and settings danger actions at tablet width. |

## Settings Page

Component: `SettingsScreen.tsx`, `LatencyWizard.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 3278-3323 | `.settings-note-card`, `.settings-danger-card`, `.settings-confirm-row` | Settings note cards, danger card spacing, confirmation row, and destructive action alignment. |
| 3607-3625 | `.settings-layout`, `.settings-tabs`, `.settings-grid`, labels | Settings page two-column tab/content layout and form grid. |
| 3626-3715 | `.latency-*` | Latency calibration row, modal overlay/panel/body, progress dots, tap button, result card, hints, and actions. |
| 3716-3736 | `.keyboard-size-preview-row`, `.keyboard-size-thumbnail`, `.settings-note-card` | Keyboard size preview controls and note card alignment. |
| 4930-5010 | `.settings-tab-row`, `.settings-panel`, `.settings-content-grid`, `.settings-group-*`, `.settings-grid-single`, `.settings-danger-*` | Later settings tab row, group cards, headers/body/footer, single-column setting grid, and danger zone/actions. |
| 5091-5214 | Settings mobile overrides | Collapses settings danger actions, settings group headers, and tab row spacing at mobile width. |

## Learn Hub And Lesson Pages

Components: `LearnHubScreen.tsx`, `LessonScreen.tsx`, `LessonDiagram.tsx`

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 4136-4174 | `.learn-hub-screen`, `.lesson-screen`, `.learn-hub-controls`, `.learn-tier`, `.lesson-*`, `.learn-hub-summary` | Learn/lesson shell alignment, shared lesson panel surfaces, and learn hub summary panel. |
| 4175-4208 | `.learn-hub-summary*`, `.learn-hub-controls`, `.learn-hub-toggle` | Learn hub summary typography, controls row, and toggle control. |
| 4208-4268 | `.learn-tier-*`, `.learn-lesson-card*` | Tier list, collapsible tier header/meta, lesson card grid, hover/completed/disabled states. |
| 4269-4325 | `.learn-capstone-*`, `.learn-lesson-status`, `.learn-lesson-meta` | Tier capstone card, locked/cleared states, status pill, and lesson metadata row. |
| 4332-4387 | `.lesson-screen-hero`, `.lesson-hero-meta`, `.lesson-layout`, `.lesson-stepper`, `.lesson-step-button*` | Lesson hero, hero stats, side stepper layout, step buttons, active/completed states. |
| 4394-4447 | `.lesson-empty-state`, `.lesson-complete-panel`, `.lesson-step-*`, `.lesson-step-nav`, `.lesson-complete-actions` | Lesson empty/completion panels, step badges/copy/actions/footer/nav. |
| 4448-4524 | `.lesson-diagram`, `.lesson-keyboard-diagram*`, `.lesson-keyboard-label*`, `.lesson-finger-*`, `.lesson-setup-diagram`, `.lesson-image-diagram` | Lesson diagram containers, embedded keyboard diagrams, finger diagrams, setup diagrams, and image diagrams. |
| 4531-4561 | Lesson responsive rules | Collapses lesson layout and stacks lesson headers/actions/meta on tablet/mobile. |
| 4701-4727 | `.learn-tier-progress`, `.learn-lesson-progress*` | Progress bars and copy for tiers and individual lessons. |

## Miscellaneous / Cross-Referenced Sections

These sections are not owned by only one page.

| Lines | Selectors / area | Function |
| --- | --- | --- |
| 1388-1418 | `.import-progress*` | Used by library import flows, but visually shares progress bar behavior with other panels. |
| 1565-1608 | `.results-grid`, `.canvas-shell`, `.performance-graph-canvas` | Shared result/game layout and canvas sizing; appears in gameplay and results/dashboard contexts. |
| 3959-3985 | `.daily-goal-panel`, `.daily-goal-*` | Daily goal panel and progress bar, shown through app-level progress/goal UI. |
| 5043-5047 | `.advanced-filters button:focus-visible` within shared focus block | Library advanced filter focus state included in the global focus grouping. |

## Organization Notes For A Future Refactor

1. Move the token/theme/base rules first and keep them together.
2. Put shared primitives next: app chrome, panels, buttons, form fields, status cards, keyboard, toasts, loading, animations.
3. Group page-specific rules by screen: Main Menu, Game Session, Library, Results, Theory, Free Play, Soundboard, Setup, Keyboard Setup, Progress, Settings, Learn/Lessons.
4. Merge duplicate page blocks where possible. Main Menu has the largest duplication: early rules at lines 1156-1331 are mostly superseded by lines 5215-6144.
5. Keep responsive rules near the page or component they affect instead of collecting unrelated media queries in global blocks.
6. Keep shared component styles near their shared component owner. Good candidates are `PianoKeyboard`, `ImmersiveHud`, buttons/panels, tags, toasts, charts, and loading panels.
