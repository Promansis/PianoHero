---
name: LumaKeys
description: "A playable piano practice stage for songs, lessons, theory, and free play."
colors:
  stage-black-blue: "#010819"
  stage-top: "#0d0e14"
  stage-bottom: "#141620"
  stage-ivory: "#fff8ec"
  text-light: "#f4f6ff"
  warm-ink: "#241f1a"
  warm-surface: "#fffaf2"
  warm-input: "#fffaf4"
  menu-deck: "#020a1c"
  keyboard-stage-start: "#161926"
  keyboard-stage-end: "#090b12"
  accent-violet: "#7c6aff"
  accent-rose: "#ff6b9d"
  neon-cyan: "#18ddff"
  neon-teal: "#00f6d2"
  neon-blue: "#4a86ff"
  neon-violet: "#9b5cff"
  neon-gold: "#ffd36f"
  neon-magenta: "#f45cff"
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
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  body:
    fontFamily: "'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "'Barlow Semi Condensed', 'Sora Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.12em"
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
    padding: "6px 9px"
    height: "34px"
  input-default:
    backgroundColor: "{colors.warm-input}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  panel-default:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
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

LumaKeys is the visible app identity for the PianoHero product brief: a focused practice stage where beginners and intermediate players can import songs, follow lessons, drill theory, and play freely without feeling like they are inside a school portal. The interface should feel like an instrument surface first and a software dashboard second. Musical action, feedback, timing, and progress sit closest to the user.

The system is dark-first for performance and free play, with light and warm themes available for calmer practice contexts. It earns its spectacle through musical feedback: falling notes, piano keys, HUD stats, menu cards, audio controls, and reward moments. Dense controls are allowed, but they must feel like a cockpit for practice, not an administrative form.

**Key Characteristics:**
- Dark stage shells with illuminated controls, not ordinary web sections.
- A restrained core UI vocabulary with vivid accents reserved for state, hand color, route identity, and rewards.
- Rounded, tactile controls for regular app flow; clipped neon deck controls only where the screen is intentionally immersive.
- Always-readable status text for users whose hands are busy at the keyboard.
- Progressive complexity: start with play, reveal setup and tuning when needed.

## 2. Colors

The palette is a night-stage system: deep blue-black surfaces, warm ivory text, violet and rose practice accents, and a neon menu spectrum for moments that should feel playful.

### Primary
- **Stage Black Blue**: The main-menu and immersive-stage floor. Use it for full-screen practice contexts, canvas-adjacent areas, and modal HUD layers.
- **Accent Violet**: The default dark-theme action and selection color. Use it for primary actions, current state, active keys, and left-hand defaults.
- **Accent Rose**: The secondary dark-theme action color. Use it for right-hand defaults, active-route contrast, and expressive feedback.

### Secondary
- **Neon Cyan**: The brightest system signal. Use for main-menu light beams, settings focus accents, HUD glows, and special route identity.
- **Neon Gold**: Reward, perfect timing, and celebratory warmth. Use sparingly so perfect hits and achievements keep value.
- **Neon Magenta / Neon Coral**: High-energy route accents and destructive or urgent states in immersive screens. Do not use them as neutral decoration.

### Tertiary
- **Success Green**: Correct, complete, improved, unlocked, or on-target states.
- **Info Blue**: OK timing, secondary chart data, and neutral guidance.
- **Miss Red**: Missed notes, destructive actions, reset areas, and danger feedback.

### Neutral
- **Stage Ivory**: Primary text on dark immersive surfaces.
- **Warm Ink**: Primary text in light and warm panels.
- **Warm Surface / Warm Input**: Light-theme panels, inputs, charts, and form surfaces.
- **Keyboard Stage Start / End**: Piano-keyboard wells and canvas-adjacent depth.

### Named Rules

**The Stage First Rule.** Gameplay, free play, soundboard, and menu surfaces must read as immersive environments before they read as pages.

**The Earned Neon Rule.** Saturated neon belongs to state, route identity, reward, or musical feedback. Inactive surfaces stay muted.

**The Hand Color Rule.** Left and right hand colors are functional identifiers. Never reuse the same pair for unrelated decorative accents on the same screen.

## 3. Typography

**Display Font:** Oxanium Variable with Sora, Segoe UI, system-ui fallbacks.
**Body Font:** Sora Variable with Segoe UI, system-ui, Apple system fallbacks.
**Label Font:** Barlow Semi Condensed with Sora and system fallbacks.

**Character:** Oxanium gives the interface its rhythm-game and stage-instrument identity. Sora carries readable body copy and controls. Barlow Semi Condensed is reserved for short telemetry labels, tabs, eyebrows, counters, and HUD metadata.

### Hierarchy
- **Display** (800, large clamp, 0.88 line-height): Route heroes and the main-menu title only. Keep letter spacing at 0.
- **Headline** (800, responsive 1.65rem to 2.4rem, 1 line-height): Section headings, route headings, and immersive panel titles.
- **Title** (800, 1.35rem, 1 line-height): Settings panels, cards, menu cards, stat headers, and compact tool surfaces.
- **Body** (400, 1rem, 1.6 line-height): Explanatory copy, labels with values, descriptions, and settings help. Cap prose around 65 to 75 characters where possible.
- **Label** (800, 0.78rem, 0.12em to 0.18em tracking): Eyebrows, HUD labels, tab kickers, chips, and compact status text. Labels are uppercase only when they are telemetry or navigation metadata.

### Named Rules

**The Hands-Busy Rule.** Text near performance controls must be short, high contrast, and scannable from a playing posture.

**The Display Reserve Rule.** Oxanium display scale is for stage identity and major state. Do not use hero-sized type inside settings cards, table rows, or compact controls.

## 4. Elevation

LumaKeys uses a hybrid of tonal layering, glow, and depth shadows. Standard panels are softly lifted. Immersive menus and settings decks use deeper shadows, backdrop blur, conic glows, and active outlines to behave like illuminated hardware. Blur is allowed only when a surface floats above a stage or canvas; it is not generic glass styling.

### Shadow Vocabulary
- **Panel Shadow** (`0 22px 52px rgba(0, 0, 0, 0.38)` in dark theme): Default panel separation on dark app screens.
- **Hero Shadow** (`0 34px 84px rgba(0, 0, 0, 0.42)` in dark theme): Large route panels and hero containers.
- **Topbar Shadow** (`0 18px 44px rgba(0, 0, 0, 0.24)`): Fixed chrome and immersive HUD bands.
- **Menu Card Hover Glow** (`0 32px 120px rgba(0, 0, 0, 0.42)` plus colored glow): Main-menu cards only.
- **Settings Deck Glow** (`0 28px 88px rgba(0, 0, 0, 0.34)` plus active accent glow): Settings panels and tab decks only.

### Named Rules

**The Overlay Blur Rule.** Backdrop blur belongs to HUDs, popouts, topbars, and stage overlays. Do not apply blur to every card by default.

**The Lift Means Action Rule.** Translate and glow on hover only for clickable cards or controls. Static information panels should not jump.

## 5. Components

### Buttons
- **Shape:** Shared app buttons are pill-shaped. Immersive settings buttons use clipped 8px deck corners.
- **Primary:** Gradient from the active accent to a lighter mix, light text, and a soft accent shadow. Use for the one next action in a local group.
- **Secondary:** Muted surface hover background, text color from the current theme, and a 1px border.
- **Danger:** Miss-red or coral-tinted fill with a stronger border. Use only for destructive operations.
- **Hover / Focus:** Hover moves up 1 to 2px and strengthens glow. Focus-visible uses a visible outline and an offset ring.

### Chips
- **Style:** Chips reuse secondary-button or compact nav-button vocabulary: pill shape, 1px border, label font, and muted background.
- **State:** Selected chips use the active accent as a soft fill and stronger border. Disabled chips reduce opacity and never rely on color alone.

### Cards / Containers
- **Corner Style:** Regular panels and song cards use 24px corners. Status cards use 18px. Menu cards use 18px. Settings deck cards use 8px clipped corners.
- **Background:** Standard app panels use theme panel surfaces. Immersive cards use dark translucent deck surfaces with accent-tinted gradients.
- **Shadow Strategy:** Use panel shadows for standard content, hero shadows for major route blocks, and strong colored glow only for main menu, settings decks, rewards, and active musical feedback.
- **Border:** Borders are 1px. Do not use thick side-stripe borders.
- **Internal Padding:** Standard panel padding is 24px. Compact HUD items use 3px to 9px. Settings group cards use 12px.

### Inputs / Fields
- **Style:** Global inputs use 12px radius, 10px by 12px padding, theme input background, and 1px border.
- **Settings Fields:** Settings inputs use 8px clipped deck corners, darker fills, active accent borders, and compact 36px minimum height.
- **Focus:** Focus rings must be visible and offset. In settings, focus also gets an accent glow.
- **Disabled:** Disabled fields reduce opacity and remain legible.

### Navigation
- **Topbar:** Fixed app chrome with a dark translucent band, three-zone grid, compact buttons, and horizontal nav that collapses to two rows below 780px.
- **Immersive HUD:** Hidden until hover, focus, or pin. It slides down from the top, keeps performance stats compact, and leaves the canvas or keyboard stage unobstructed.
- **Settings Tabs:** Five equal tabs with icon, kicker, title, clipped corners, active-accent glow, and no wrapping label text.

### Signature Stage Components
- **Piano Keyboard:** Key surfaces are grounded in a zero-radius keyboard stage. Active notes use glow and inset outlines, not large labels.
- **Falling Notes / Free Play Visualizer:** Canvas and visualizer areas are the main experience. They should be full-bleed or stage-like, never framed as a marketing preview card.
- **Main Menu Card:** Menu cards are 3D, neon-lit entry points with icon, title, short action label, and hover popover. They are allowed to be expressive because they are the launch stage, not a settings form.

## 6. Do's and Don'ts

### Do:
- **Do** preserve the focused practice stage: musical action, score feedback, HUD stats, and keyboard state should stay visually closest to the learner.
- **Do** use dark immersive surfaces for play, free play, soundboard, and main menu contexts.
- **Do** keep setup and settings dense but controlled: group related controls, keep labels short, and reveal advanced options progressively.
- **Do** keep exact functional colors consistent: success for completion, warning or gold for perfect and reward states, miss red for failure or danger.
- **Do** respect the 780px mobile breakpoint by reducing columns, shrinking HUD items, and preventing text overlap.
- **Do** support reduced motion by removing entrance animations and hover choreography where the stylesheet already provides a reduced-motion path.

### Don't:
- **Don't** make PianoHero feel like a generic website.
- **Don't** make it feel like a school portal, worksheet app, or classroom software.
- **Don't** make dense screens feel like an enterprise dashboard or administrative form.
- **Don't** bury the player in configuration before they can play.
- **Don't** use marketing-section composition for product screens. No landing-page card stacks, hero metrics, or decorative feature grids inside the app shell.
- **Don't** use border-left or border-right greater than 1px as a colored side stripe on cards, alerts, or lists.
- **Don't** add gradient text outside the existing main-menu title treatment. New text emphasis should use weight, size, or a single solid color.
- **Don't** apply glassmorphism as a default card style. Blur must mean overlay, HUD, popout, or stage depth.
- **Don't** use decorative motion that does not communicate hover, focus, selection, loading, reveal, timing, or musical feedback.
