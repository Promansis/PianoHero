---
name: LumaKeys
description: "A playable piano practice stage for songs, lessons, theory, and free play."
colors:
  stage-black-blue: "#010819"
  stage-top: "#0d0e14"
  stage-bottom: "#141620"
  stage-void: "#090b12"
  stage-ivory: "#fff8ec"
  text-light: "#f4f6ff"
  warm-ink: "#241f1a"
  warm-surface: "#fffaf2"
  warm-input: "#fffaf4"
  menu-deck: "#020a1c"
  settings-base: "#101525"
  settings-void: "#080b16"
  keyboard-stage-start: "#161926"
  keyboard-stage-end: "#090b12"
  accent-violet: "#7c6aff"
  accent-rose: "#ff6b9d"
  neon-cyan: "#18ddff"
  neon-teal: "#00f6d2"
  neon-blue: "#4a86ff"
  neon-violet: "#9b5cff"
  neon-gold: "#ffd36f"
  neon-orange: "#ff9f2f"
  neon-magenta: "#f45cff"
  neon-hot-pink: "#ff6bb7"
  neon-coral: "#ff7a8a"
  success: "#40b56a"
  warning: "#f5c542"
  info: "#4a90d9"
  miss: "#bf5b44"
typography:
  display:
    fontFamily: "'Oxanium Variable', 'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(3.8rem, 7.4vw, 6.8rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0"
  headline:
    fontFamily: "'Oxanium Variable', 'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.65rem, 2.4vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  title:
    fontFamily: "'Oxanium Variable', 'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "1.14rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "0"
  body:
    fontFamily: "'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  control:
    fontFamily: "'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0"
  label:
    fontFamily: "'Barlow Semi Condensed', 'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.075em"
rounded:
  xs: "3px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  stage: "0"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  panel: "24px"
  settings-card: "14px"
  settings-panel: "16px"
  shell-x: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-violet}"
    textColor: "{colors.stage-ivory}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.stage-bottom}"
    textColor: "{colors.text-light}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  settings-button-primary:
    backgroundColor: "{colors.neon-cyan}"
    textColor: "{colors.stage-black-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
    height: "34px"
  settings-button-orange:
    backgroundColor: "{colors.neon-orange}"
    textColor: "{colors.stage-black-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
    height: "34px"
  input-default:
    backgroundColor: "{colors.warm-input}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  settings-input:
    backgroundColor: "{colors.settings-base}"
    textColor: "{colors.stage-ivory}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "4px 11px"
    height: "34px"
  panel-default:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  settings-deck-card:
    backgroundColor: "{colors.settings-void}"
    textColor: "{colors.stage-ivory}"
    rounded: "{rounded.sm}"
    padding: "14px"
  immersive-hud-item:
    backgroundColor: "{colors.stage-black-blue}"
    textColor: "{colors.text-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
  menu-card-primary:
    backgroundColor: "{colors.menu-deck}"
    textColor: "{colors.stage-ivory}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "22px"
---

# Design System: LumaKeys

## 1. Overview

**Creative North Star: "The Playable Practice Stage"**

LumaKeys is the visible app identity for PianoHero: a focused practice stage where beginners and intermediate players can import songs, follow lessons, drill theory, and play freely without feeling like they are inside a school portal. The interface should feel like an instrument surface first and a software dashboard second. Musical action, feedback, timing, and progress sit closest to the user.

The strongest current design reference is `src/renderer/components/SettingsScreen.tsx` with its companion CSS in `src/renderer/styles.css`. Settings proves the direction: dense product controls can still feel theatrical when they use clipped deck geometry, compact telemetry, neon accents, precise labels, and visible save feedback. New product screens should borrow that discipline before inventing a new surface language.

The system is dark-first for performance, free play, main menu, soundboard, and high-control screens. Light and warm themes exist for calmer app contexts, but the brand should still preserve a stage-like sense of depth. Spectacle is earned through musical feedback, not generic decoration.

**Key Characteristics:**
- Dark stage shells with illuminated controls, not ordinary web sections.
- Compact, cockpit-like settings and setup surfaces with clear grouping and immediate state feedback.
- Saturated neon accents reserved for state, route identity, musical energy, rewards, and calibration.
- Neon orange is a first-class energy color for motion, tempo, calibration, and warm transition glows.
- Rounded, tactile controls for regular app flow; clipped 8px deck controls for immersive and settings contexts.
- Always-readable status text for users whose hands are busy at the keyboard.
- Progressive complexity: start with play, reveal setup and tuning when needed.

## 2. Colors

The palette is a night-stage system: deep blue-black surfaces, warm ivory text, violet and rose practice accents, and a neon spectrum that becomes functional in settings, HUDs, route identity, and musical feedback. The frontmatter uses sRGB hex for DESIGN.md tooling; the Settings implementation authors many active accents in OKLCH for cleaner color mixing.

### Primary

- **Stage Black Blue** (`#010819`): The main-menu and immersive-stage floor. Use for full-screen practice contexts, canvas-adjacent areas, and modal HUD layers.
- **Settings Base** (`#101525`): The settings deck atmosphere, close to `oklch(12% 0.045 263)`. Use for dense control surfaces that need high contrast and a technical stage feel.
- **Accent Violet** (`#7c6aff`): The default dark-theme action and selection color. Use for primary actions, current state, active keys, and left-hand defaults.
- **Accent Rose** (`#ff6b9d`): The secondary dark-theme action color. Use for right-hand defaults, expressive contrast, and active-route variation.

### Secondary

- **Neon Cyan** (`#18ddff`): The brightest system signal. Use for main-menu light beams, settings focus accents, HUD glows, route identity, and "active system" states.
- **Neon Orange** (`#ff9f2f`): The warm energy accent. Use for tempo, calibration, movement, progress heat, warm background beams, and transition glows. It should feel like stage light spilling across the deck, not a generic warning color.
- **Neon Gold** (`#ffd36f`): Reward, perfect timing, audio warmth, and celebratory confirmation. Use sparingly so perfect hits and achievements keep value.
- **Neon Magenta / Hot Pink** (`#f45cff`, `#ff6bb7`): High-energy visual identity, special route accents, and expressive settings panels. Avoid using them as inactive decoration.
- **Neon Coral** (`#ff7a8a`): Gameplay timing pressure and danger-adjacent energy. It can sit near destructive flows, but do not confuse it with the miss color.

### Tertiary

- **Success Green** (`#40b56a`): Correct, complete, saved, improved, unlocked, or on-target states.
- **Info Blue** (`#4a90d9`): Input device status, neutral guidance, queued saves, and secondary chart data.
- **Warning Gold** (`#f5c542`): Waiting, saving, attention, perfect timing, and non-destructive caution.
- **Miss Red** (`#bf5b44`): Missed notes, destructive actions, reset areas, and danger feedback.

### Neutral

- **Stage Ivory** (`#fff8ec`): Primary text on dark immersive surfaces.
- **Text Light** (`#f4f6ff`): Cool text on dark app and HUD surfaces.
- **Warm Ink** (`#241f1a`): Primary text in light and warm panels.
- **Warm Surface / Warm Input** (`#fffaf2`, `#fffaf4`): Light-theme panels, inputs, charts, and form surfaces.
- **Keyboard Stage Start / End** (`#161926`, `#090b12`): Piano-keyboard wells and canvas-adjacent depth.

### Named Rules

**The Stage First Rule.** Gameplay, free play, soundboard, settings, and menu surfaces must read as immersive environments before they read as pages.

**The Earned Neon Rule.** Saturated neon belongs to state, route identity, reward, motion, calibration, or musical feedback. Inactive surfaces stay muted.

**The Orange Energy Rule.** Neon orange is not the danger color. Use it for heat, tempo, velocity, calibration, and warm stage-light accents. Pair danger with miss red or coral.

**The Hand Color Rule.** Left and right hand colors are functional identifiers. Never reuse the same pair for unrelated decorative accents on the same screen.

## 3. Typography

**Display Font:** Oxanium Variable with Sora, Segoe UI, system-ui fallbacks.
**Body Font:** Sora Variable with Segoe UI, system-ui, Apple system fallbacks.
**Label Font:** Barlow Semi Condensed with Sora and system fallbacks.

**Character:** Oxanium gives the interface its rhythm-game and stage-instrument identity. Sora carries readable body copy and controls. Barlow Semi Condensed is the settings and HUD metadata voice: small, confident, uppercase, and highly scannable.

### Hierarchy

- **Display** (800, large clamp, 0.88 line-height): Route heroes and the main-menu title only. Keep letter spacing at 0.
- **Headline** (800, responsive 1.65rem to 2.4rem, 1 line-height): Section headings, route headings, and immersive panel titles.
- **Route / Settings Heading** (800, 1.55rem, 1.04 line-height): Settings status title and compact screen identity. This is the preferred scale for dense product screens.
- **Title** (800, 1.14rem to 1.35rem, 1.08 line-height): Settings group cards, cards, menu cards, stat headers, and compact tool surfaces.
- **Body** (400 to 650, 0.94rem to 1rem, 1.36 to 1.6 line-height): Explanatory copy, note-card values, settings help, and panel descriptions. Cap prose around 65 to 75 characters where possible.
- **Control** (500, 0.88rem, 1.25 line-height): Selects, inputs, compact values, and repeated form controls.
- **Label** (800, 0.68rem to 0.78rem, 0.075em to 0.12em tracking): Eyebrows, HUD labels, tab kickers, chips, save telemetry, and status text. Labels are uppercase only when they are telemetry or navigation metadata.

### Named Rules

**The Hands-Busy Rule.** Text near performance controls must be short, high contrast, and scannable from a playing posture.

**The Settings Reference Rule.** For dense product UI, use the Settings screen's type rhythm: Barlow metadata, Oxanium compact titles, Sora controls, and no oversized hero copy.

**The Display Reserve Rule.** Oxanium display scale is for stage identity and major state. Do not use hero-sized type inside settings cards, table rows, forms, or compact controls.

## 4. Elevation

LumaKeys uses a hybrid of tonal layering, glow, and depth shadows. Standard panels are softly lifted. The current settings deck pushes the system forward with deeper shadows, conic border glows, clipped corners, active-accent washes, and visible focus rings. Blur is allowed only when a surface floats above a stage or canvas; it is not generic glass styling.

### Shadow Vocabulary

- **Panel Shadow** (`0 22px 52px rgba(0, 0, 0, 0.38)` in dark theme): Default panel separation on dark app screens.
- **Hero Shadow** (`0 34px 84px rgba(0, 0, 0, 0.42)` in dark theme): Large route panels and hero containers.
- **Topbar Shadow** (`0 18px 44px rgba(0, 0, 0, 0.24)`): Fixed chrome and immersive HUD bands.
- **Settings Deck Shadow** (`0 28px 88px rgba(0, 0, 0, 0.34)`): The main settings panel and modal deck depth.
- **Settings Group Lift** (`0 18px 46px rgba(0, 0, 0, 0.18)` plus inset highlight): Default settings group cards.
- **Settings Featured Group Lift** (`0 22px 58px rgba(0, 0, 0, 0.24)` plus accent glow): The primary card in a settings tab.
- **Menu Card Hover Glow** (`0 32px 120px rgba(0, 0, 0, 0.42)` plus colored glow): Main-menu cards only.

### Named Rules

**The Overlay Blur Rule.** Backdrop blur belongs to HUDs, popouts, topbars, dialogs, and stage overlays. Do not apply blur to every card by default.

**The Lift Means Action Rule.** Translate and glow on hover only for clickable cards or controls. Static information panels should not jump.

**The Conic Edge Rule.** Settings-style cards can use a subtle conic border glow to imply hardware. Keep the opacity low at rest and strengthen it only on focus or active states.

## 5. Components

### Buttons

- **Shape:** Shared app buttons are pill-shaped. Settings and immersive deck buttons use 8px corners with a clipped top-right and bottom-left cut.
- **Primary:** In settings, the fill is the local card accent mixed darker, with dark ink text, compact 34px minimum height, Barlow label type, icon support, and a visible glow.
- **Orange Primary:** Use neon orange for calibration, tempo, warm transition, or high-energy motion actions. Do not use orange for destructive confirmation.
- **Secondary:** Muted deck fill, accent-tinted border, light text, inset top highlight, and the same clipped 8px geometry in settings.
- **Danger:** Miss-red or coral-tinted fill with a stronger border. Use only for destructive operations.
- **Hover / Focus:** Hover moves up 2px and strengthens glow. Focus-visible uses a 3px outline with 4px offset plus an accent halo.
- **Disabled:** Keep shape and label readable; reduce opacity and remove energetic motion.

### Chips

- **Style:** Chips reuse secondary-button or compact nav-button vocabulary: pill shape in regular app surfaces, clipped 8px deck shape inside settings or immersive chrome, 1px border, label font, and muted background.
- **State:** Selected chips use the active accent as a soft fill and stronger border. Disabled chips reduce opacity and never rely on color alone.

### Cards / Containers

- **Corner Style:** Regular panels and song cards use 24px corners. Status cards use 18px. Menu cards use 18px. Settings deck cards use 8px clipped corners with 8px to 12px diagonal cuts.
- **Background:** Standard app panels use theme panel surfaces. Immersive and settings cards use dark translucent deck surfaces with accent-tinted radial and linear washes.
- **Shadow Strategy:** Use panel shadows for standard content, hero shadows for major route blocks, and strong colored glow only for main menu, settings decks, rewards, and active musical feedback.
- **Border:** Borders are 1px. Settings can use accent-mixed borders and conic edge effects. Do not use thick side-stripe borders.
- **Internal Padding:** Standard panel padding is 24px. Settings panel padding is 16px. Settings group-card padding is 14px to 16px. Compact HUD items use 3px to 9px.

### Inputs / Fields

- **Global Style:** Inputs use 12px radius, 10px by 12px padding, theme input background, and a 1px border.
- **Settings Style:** Settings inputs and selects use 8px radius, 34px minimum height, 4px by 11px padding, dark deck fill, Sora 0.88rem text, and local card-accent borders.
- **Selects:** Use the custom chevron treatment from Settings: two small accent triangles, no native browser chrome where supported.
- **Ranges:** Use an accent-filled track with a 20px clipped thumb, save-flash animation after queued persistence, and visible focus scaling.
- **Color Inputs:** Use compact swatches with accent glow and clear labels. Pair swatches with reset buttons when a theme fallback exists.
- **Focus:** Focus rings must be visible and offset. In settings, focus also gets a local accent glow and a slight upward transform.
- **Disabled:** Disabled fields reduce opacity and remain legible.

### Navigation

- **Topbar:** Fixed app chrome with a dark translucent band, three-zone grid, compact buttons, and route nav. On settings, the topbar inherits the neon deck language with cyan-tinted borders and clipped nav buttons.
- **Immersive HUD:** Hidden until hover, focus, or pin. It slides down from the top, keeps performance stats compact, and leaves the canvas or keyboard stage unobstructed.
- **Settings Tabs:** Five equal tabs with icon, kicker, title, clipped corners, active-accent glow, scan-line overlay, and no wrapping label text. Current tab accents are gold for Audio, magenta for Visual, coral for Gameplay, info blue for Input, and teal for Practice.
- **Save Telemetry:** Settings uses a compact save signal with three square dots. Saving uses warning gold, queued uses info blue, saved uses success green. Preserve this style for any dense surface with auto-save behavior.

### Signature Stage Components

- **Settings Deck:** Treat Settings as the strongest product reference. It is dense but not administrative: tabbed, clipped, neon-lit, compact, and stateful. New preference, setup, calibration, and device surfaces should inherit this grammar.
- **Piano Keyboard:** Key surfaces are grounded in a zero-radius keyboard stage. Active notes use glow and inset outlines, not large labels.
- **Falling Notes / Free Play Visualizer:** Canvas and visualizer areas are the main experience. They should be full-bleed or stage-like, never framed as a marketing preview card.
- **Main Menu Card:** Menu cards are 3D, neon-lit entry points with icon, title, short action label, and hover popover. They are allowed to be expressive because they are the launch stage, not a settings form.
- **Confirmation Modal:** Settings confirmation modals use the same clipped deck geometry, focus trap behavior, warning icon, and explicit cancel action. Use modal confirmation only for genuinely destructive or high-risk actions.

## 6. Do's and Don'ts

### Do:

- **Do** preserve the focused practice stage: musical action, score feedback, HUD stats, and keyboard state should stay visually closest to the learner.
- **Do** use `SettingsScreen.tsx` as the reference for dense product surfaces, especially grouped controls, tab navigation, save state, and destructive actions.
- **Do** use dark immersive surfaces for play, free play, soundboard, settings, and main menu contexts.
- **Do** add neon orange where the interaction needs warmth, speed, tempo, calibration, or energetic transition.
- **Do** keep setup and settings dense but controlled: group related controls, keep labels short, and reveal advanced options progressively.
- **Do** keep exact functional colors consistent: success for completion, warning or gold for saving and perfect states, miss red for failure or danger.
- **Do** use icons inside compact settings buttons when the action benefits from quick recognition.
- **Do** support reduced motion by removing entrance animations and hover choreography where the stylesheet already provides a reduced-motion path.

### Don't:

- **Don't** make PianoHero feel like a generic website.
- **Don't** make it feel like a school portal, worksheet app, or classroom software.
- **Don't** make dense screens feel like an enterprise dashboard or administrative form.
- **Don't** bury the player in configuration before they can play.
- **Don't** use neon orange as the destructive color. Danger belongs to miss red and danger coral.
- **Don't** use marketing-section composition for product screens. No landing-page card stacks, hero metrics, or decorative feature grids inside the app shell.
- **Don't** use border-left or border-right greater than 1px as a colored side stripe on cards, alerts, or lists.
- **Don't** add gradient text. New text emphasis should use weight, size, or a single solid color.
- **Don't** apply glassmorphism as a default card style. Blur must mean overlay, HUD, popout, topbar, or stage depth.
- **Don't** use decorative motion that does not communicate hover, focus, selection, loading, reveal, timing, save status, or musical feedback.
