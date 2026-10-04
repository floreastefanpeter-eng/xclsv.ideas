---
name: Punte
description: "Elevul semnează. Clasa înțelege." A classroom lesson drawn as a metro line between a hearing teacher and a deaf student.
colors:
  prof-signal-red: "#d4141c"
  prof-red-deep: "#a30e14"
  prof-red-wash: "#fde7e7"
  prof-red-night-line: "#ff5a5f"
  elev-metro-blue: "#1747c4"
  elev-blue-deep: "#0e2f8a"
  elev-blue-wash: "#e3eafb"
  elev-blue-night-line: "#6c93ff"
  station-ink: "#0d1626"
  ink-platform: "#1b2740"
  ink-rail: "#2a3856"
  cool-white-ground: "#f2f4f8"
  plate-white: "#ffffff"
  steel: "#c9d1de"
  border-steel-light: "#d3d9e3"
  input-steel: "#a9b4c6"
  muted-concrete: "#e4e8ef"
  muted-ink-text: "#46526a"
  attention-amber: "#f2a100"
  sem-semneaza: "#1747c4"
  sem-intrebare: "#f2a100"
  sem-inteles: "#13803f"
  sem-neinteles: "#d4141c"
  sem-neutru: "#8a96ab"
  warn-soft: "#fff1cc"
  warn-ink: "#6b4300"
  danger-soft: "#fde7e7"
  danger-ink: "#8a0b10"
  ok-soft: "#dcf3e4"
  ok-ink: "#0b4d26"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 82"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 82"
  plate:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    fontVariation: "'wdth' 82"
  caption-stop:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
  code-cells:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    letterSpacing: "0.18em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 75"
rounded:
  sm: "3.6px"
  md: "4.8px"
  lg: "6px"
  xl: "6px"
  2xl: "7.8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  station-band:
    backgroundColor: "{colors.station-ink}"
    textColor: "{colors.plate-white}"
    height: "64px"
    padding: "8px 16px"
  plate-ink:
    backgroundColor: "{colors.station-ink}"
    textColor: "{colors.plate-white}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  plate-prof:
    backgroundColor: "{colors.prof-signal-red}"
    textColor: "{colors.plate-white}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  plate-elev:
    backgroundColor: "{colors.elev-metro-blue}"
    textColor: "{colors.plate-white}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  plate-amber:
    backgroundColor: "{colors.attention-amber}"
    textColor: "{colors.station-ink}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  panel:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.station-ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  panel-strip:
    height: "48px"
    padding: "8px 16px"
    typography: "{typography.plate}"
  button-primary:
    backgroundColor: "{colors.elev-metro-blue}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-prof:
    backgroundColor: "{colors.prof-signal-red}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-prof-hover:
    backgroundColor: "{colors.prof-red-deep}"
  button-outline:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.station-ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-lg:
    rounded: "{rounded.xl}"
    height: "56px"
    padding: "0 24px"
  input:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.station-ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "4px 10px"
  input-code:
    typography: "{typography.code-cells}"
    rounded: "{rounded.lg}"
    height: "56px"
  chip-elev:
    backgroundColor: "{colors.elev-blue-wash}"
    textColor: "{colors.elev-blue-deep}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  insigna-elev:
    backgroundColor: "{colors.elev-metro-blue}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  insigna-prof:
    backgroundColor: "{colors.prof-signal-red}"
    textColor: "{colors.plate-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Punte

## Overview

**Creative North Star: "The Transfer Station"**

Punte is metro wayfinding applied to a lesson. The teacher runs on the red line, the student on the blue line, and the bridge between them is the transfer station. Every device that joins a lesson is a station on a line map. Every utterance is a stop on a vertical route, with the time in a fixed column, a 4px rail, and a round station dot. Section headings are station plates: solid colour fields carrying condensed, uppercase Archivo, like the signs on a platform wall. The navy station band across the top of every screen ends in a red-then-blue stripe, so you always know which network you're on.

The density is operational. Screens are read in noisy classrooms, on phones on a desk, and from the back row on a projector, so type runs large (body 1.125rem, captions in bold, projector captions up to 4.5rem). Contrast is high and every touch target is at least 44px. Colour carries identity (red is the teacher, blue is the student, amber means attention) and never carries meaning alone: every semafor colour has a text label beside it. Shared screens (projector `/clasa`, student desk `/masa`) switch to a night palette of navy ink with brightened line colours.

This system rejects the grey SaaS dashboard with one accent colour and soft white cards. Containers are signage, not cards.

**Key Characteristics:**
- Two pinned line colours, signal red and metro blue, used as full-bleed plates rather than accents.
- Navy station band with a 6px red/blue stripe on every route.
- Condensed uppercase Archivo (800, width 75%) for plates; Atkinson Hyperlegible for everything people read.
- Conversation drawn as a route: time column, 4px rail, ring-shaped station dots.
- Squarish corners (4.8–6px) everywhere except round station dots and LEDs.
- Night mode for shared screens: ink ground, lighter "night line" tints.

## Colors

A wayfinding palette: two saturated line colours, one navy ink, one amber, on a cool white ground.

### Primary
- **Signal Red, the teacher line** (prof-signal-red): the profesor's identity. Teacher plates, the teacher Insigna, the "Lecție nouă" panel strip, the primary mic button on the teacher screen, the teacher rail and station ring in the conversation. It also serves as the `destructive` colour and the "Nu înțeleg" semafor state.
- **Metro Blue, the student line** (elev-metro-blue): the elev's identity and the app-wide `primary` (default buttons, focus ring, text caret). Student plates, the student Insigna, the student rail and station ring.

### Secondary
- **Red Deep / Blue Deep** (prof-red-deep, elev-blue-deep): hover states for line-coloured buttons, plus line-coloured small text on light grounds (speaker names, "În desfășurare"), where the full-strength line colour would be too light for small bold text.
- **Red Wash / Blue Wash** (prof-red-wash, elev-blue-wash): tinted fills behind chips ("termenul lecției", sign gloss), focus backgrounds on list rows, and the `accent` surface.
- **Night Lines** (prof-red-night-line, elev-blue-night-line): the rail and legend colours on dark surfaces, and the hand-tracking overlay stroke. Full-strength red and blue sink into navy, so night screens draw lines in these tints.

### Tertiary
- **Attention Amber** (attention-amber): the only non-line colour with authority. The "Am o întrebare" semafor, the reconnecting status pill, the amber plate, the alert ring around an Insigna, and the border of the "account required" notice. Text on amber is always station ink.

### Neutral
- **Station Ink** (station-ink): foreground text, the station band, ink plates, dark panels, and the night ground of shared screens (also exposed as `night`).
- **Ink Platform / Ink Rail** (ink-platform, ink-rail): raised layers on night screens (panel strips, form fields, the desk control bar) and the night scrollbar.
- **Cool White Ground** (cool-white-ground): the page background.
- **Plate White** (plate-white): panel bodies, form fields, popovers.
- **Steel** (steel): panel borders (at 80%), empty station dots, the system-stop rail, scrollbars.
- **Border Steel / Input Steel** (border-steel-light, input-steel): hairline dividers, and input strokes darkened for AA visibility.
- **Concrete / Muted Ink** (muted-concrete, muted-ink-text): secondary buttons and neutral chips; secondary text, timestamps, help lines.
- **Status pairs** (warn-soft/warn-ink, danger-soft/danger-ink, ok-soft/ok-ink): inline message boxes. The soft colour is the fill and the ink colour is the bold text.

### Semafor
- **Semnează** (blue), **Întrebare** (amber), **Înțeles** (green sem-inteles), **Nu înțeleg** (red), **Neutru** (sem-neutru grey, also the projector's station colour on the line map).

### Named Rules
**The Two Lines Rule.** Red always means the teacher and blue always means the student, on every surface. Never swap them and never use either as decoration. If something isn't about one of the two people, it's ink, steel or amber.

**The Labelled Light Rule.** A semafor colour never appears without its text label (the full label on the Insigna, the short label on the Semafor grid). Colour reinforces meaning; it never carries it alone.

**The Night Line Rule.** On ink grounds, rails and legends switch to the night-line tints. Full-strength red and blue stay reserved for solid plates and buttons, where white text sits on them.

## Typography

**Display Font:** Archivo (variable width axis), falling back to system-ui
**Body Font:** Atkinson Hyperlegible (400/700), falling back to system-ui

**Character:** Archivo, condensed to platform-sign proportions, does the wayfinding. Atkinson Hyperlegible, designed for low-vision readers, does the reading. Display type is loud and narrow; reading type is wide, open and bold wherever a caption has to be read at a glance.

### Hierarchy
- **Display** (Archivo 800, width 82%, 2.6rem → 3.75rem → 4.5rem, line-height 0.98): only the home slogan, split into a red line and a blue line.
- **Headline** (Archivo 800, width 82%, 2.25rem → 3rem, leading-tight): screen greetings such as "Bună, Ana" on the dashboard, with the name in the user's line colour.
- **Plate** (Archivo 800, width 75%, uppercase, 0.02em tracking, 1.125–1.875rem, line-height 1): station plates, panel strips, Insigna titles, the wordmark. This is the only uppercase display style.
- **Title** (Archivo 800, width 82%, 1.25rem, leading-tight): list row titles (lesson titles, dashboard stops).
- **Caption stop** (Atkinson 700, 1.125rem; 1.25–1.5rem in `lg`; 1.875–2.25rem in `xl`; leading-snug): conversation text. Translations take the primary line, and the Romanian original sits beneath in regular weight behind a small "RO" plate.
- **Projector caption** (Archivo 800, width 82%, line-height 1.08): the live caption on desk and class screens. The latest stop is full white and earlier stops step down to 80%.
- **Body** (Atkinson 400, 1.125rem → 1.25rem, leading-relaxed, max ~42rem): explanatory prose.
- **Label** (Atkinson 700, 0.875rem): form labels, speaker names, legends, station names, timestamps (tabular numerals).
- **Code cells** (Archivo 800, width 75%, tabular, 0.18em tracking): the 6-character lesson code, like a departure board. Also used for list-row times at tighter tracking.

### Named Rules
**The Plate Is The Only Caps Rule.** Uppercase belongs to the plate style (condensed Archivo on a solid field) and the code cells. Reading text is never set in caps.

**The Bold Caption Rule.** Anything a person must read live (captions, stop text, statuses) is set in Atkinson 700. Regular weight is for supporting text only.

## Layout

The page is a single 80rem (max-w-7xl) column with 16px gutters, widening to 24px from 640px. The station band is sticky, at least 64px tall, with the logo on the left, the current lesson (line map or title) in a flexible centre and the account on the right. Working screens (home, dashboard) split at 1024px into a narrow fixed column (26–27rem) for the action (sign in, new lesson, join) and a fluid column for the line (demo line, lesson list). Below 1024px they stack, with the action first.

Conversations use a three-column route grid: time (2.9rem, 3.4rem from 640px, 5rem in projector size), rail (1.5–2.25rem) and text. Rows are ranked by time, and a state change restyles a stop without breaking the grid. On phones, the teacher's primary control lives in a fixed bottom bar (white at 95% with a blur, padded for the safe area). Shared screens fill the viewport (min-h-dvh).

Spacing runs on a 4px base. The common steps are 8px and 12px gaps inside components, 16px panel padding (20px from 640px), and 24px between major blocks.

## Elevation & Depth

Depth comes mostly from colour, not shadows. The ground is cool white, panels are white with a steel hairline, and plates are solid colour. On night screens, layers step from ink to ink-platform to white at 5%. Shadows are reserved for a few signal objects that need to look lifted off the platform. They are always soft, tinted with ink, and pulled up under the object with a negative spread.

### Shadow Vocabulary
- **Signal lift** (`box-shadow: 0 14px 30px -18px rgba(13,22,38,0.6)`): the Insigna (the line badge with the semafor LED).
- **Demo lift** (`box-shadow: 0 18px 40px -18px rgba(13,22,38,0.55)`): the home page's live line demo.
- **Notice lift** (Tailwind `shadow-lg` / `shadow-2xl`): blocking notices (account required, screen error) and the buzz banner.
- **LED glow** (`box-shadow: 0 0 16px 3px color-mix(in srgb, var(--led) 55%, transparent)`): semafor LEDs. The glow is the light itself, and it pulses when active.

### Named Rules
**The Flat Platform Rule.** Panels, plates, list rows and buttons are flat. A shadow marks an object that is signalling (badge, alert, demo) and is always soft and ink-tinted. Never use hard offset shadows.

## Shapes

Corners are squarish, like enamel signs. The base radius is 6px. Plates, panels, chips and status pills use 4.8px; buttons, inputs, Insigna and dark sections use 6px; large buttons go up to 7.8px. Nothing is pill-shaped except what is round in a metro diagram: station dots (20px, 4px ring), LEDs, rails (4px wide, rounded ends) and legend swatches. Lines are drawn 4px thick everywhere: rails, the line-map track and legend strokes. The station band's red/blue stripe is 6px. The phrase being spoken live is drawn as a dashed rail (8px dash, 6px gap) in the red night line.

## Components

### Station Band
Character: the platform entrance sign. A navy ink bar with the logo plate (rounded navy square, red and blue strokes meeting at a white transfer dot) and the condensed "PUNTE" wordmark, a flexible centre slot, a right slot for the account and connection, and a 6px stripe underneath, half red and half blue. Navigation links inside it are ghost buttons in white, with white at 10% on hover.

### Plates
Character: station signage. Solid ink, red, blue or amber fields with plate type, 4.8px corners, 6px × 12px padding, and an optional 20px lucide icon. Use them as section headings and inline labels.

### Panels
Character: a sign with a board beneath it. A coloured strip (ink, red or blue, at least 48px tall, plate type at 1.25rem, optional action on the right) sits directly on top of a white body with a steel hairline and 4.8px corners. On dark screens the body is white at 5% and the ink strip becomes ink-platform. Panels replace soft cards everywhere.

### Buttons
- **Shape:** squarish (6px; 7.8px at `xl`).
- **Primary:** metro blue, white text, 44px tall, 16px padding, 1rem Atkinson.
- **Line variants:** on teacher surfaces the primary action is signal red with red-deep on hover. The mic-on state turns ink.
- **Sizes:** default and `sm` are both 44px, `lg` is 56px, `xl` is 64px, icon buttons are 44px. No touch target is smaller than 44px.
- **Hover / Focus:** the fill drops to 80% on hover and the button nudges down 1px on press. Focus is a 3px metro-blue outline with a 2px offset (global), plus a ring on the button itself.
- **Outline / Ghost:** outline is white with a steel border, used for secondary row actions. Ghost is used in the station band.

### Inputs / Fields
- **Style:** white fill, input-steel 1px stroke, 6px corners, 44px tall (48px with 1.125rem text in the auth form). Selects are native `<select>` with bold text, styled the same way.
- **Lesson code:** a 56px field in code-cells type at 1.875rem, centred, auto-uppercase, beside a 56px submit button.
- **Focus:** the border shifts to metro blue, with a blue ring.
- **Error:** a danger-soft box with bold danger-ink text and `role="alert"`, placed under the form.
- **Dark:** the field takes ink-platform fill, white at 25% for the stroke, and white text.

### Chips
- **Style:** 4px corners, 2px × 6px padding, 0.75rem text, with an optional 14px icon. The student tone is blue wash with blue-deep text. The neutral tone is concrete with ink text. On dark screens chips are white at 12%.

### Line Map (signature)
The lesson's devices drawn as stations on a horizontal line. The track is 4px and each segment takes the colour of the line leaving its station (red from the teacher, blue to student screens, grey to the projector). Dots are 20px with a 4px ring: filled means connected, hollow means not connected, and an extra 2px ring marks "Ești aici". Labels are bold text, truncated, with screen-reader status text. When the connection drops, an amber "Reconectare…" pill appears in front of the map.

### Route Stop (signature)
One message as a stop on the conversation route: time column, rail segment, station ring (white or ink centre, filled when the stop raises an alert), then the speaker line (icon, name, chips) and the caption. System stops are small haltes: a 14px dot on a steel rail, with bold muted text. The live phrase uses a dashed rail, an italic muted caption and a blinking dot. New stops slide in from 10px left (380ms) and the ring pulses once on arrival (900ms, `cubic-bezier(0.16, 1, 0.3, 1)`).

### Insigna (signature)
The line badge at the top of the teacher and student screens: a solid red or blue block with 6px corners and the signal lift, a 56–64px semafor LED with a white 85% rim, the name in 1.875–2.25rem plate type, and the semafor label in bold. When an alert is raised it gains a 4px amber ring and a pulsing red halo.

### Semafor
Four labelled lights in a 2×2 grid (1×4 from 640px). The active light gets an ink or white border and its LED pulses. Inactive lights fade to 45% text with the LED at 28% opacity.

## Do's and Don'ts

### Do:
- **Do** open every route with the station band and its 6px red/blue stripe.
- **Do** title sections with plates or panel strips (condensed Archivo 800, uppercase, on a solid line or ink field).
- **Do** draw any sequence over time (messages, lessons, onboarding steps) as stops on a 4px rail with 20px ring dots and a fixed time column.
- **Do** use red only for the teacher and blue only for the student, and darken to red-deep or blue-deep for small coloured text on light grounds.
- **Do** switch rails to the night-line tints (`#ff5a5f`, `#6c93ff`) on ink grounds.
- **Do** keep every interactive target at 44px or more and every semafor colour next to its label.
- **Do** set live-read text in Atkinson Hyperlegible 700, at 1.125rem or larger.
- **Do** respect `prefers-reduced-motion`. Animations collapse to a single instant frame, except the 1.5s confirm bar, which is functional.

### Don't:
- **Don't** use soft white cards with drop shadows as the default container. Use a panel (coloured strip on a white board with a steel hairline).
- **Don't** introduce a third identity colour. Amber means attention, green appears only as the "Înțeles" semafor and in ok messages, and everything else is ink and steel.
- **Don't** round containers past 7.8px or make buttons pill-shaped. Only station dots, LEDs and rails are round.
- **Don't** use hard offset shadows. Shadows are soft, ink-tinted and only on signalling objects.
- **Don't** set reading text in uppercase or in condensed Archivo. Caps belong to plates and code cells.
- **Don't** add small tracked-uppercase labels above headings. Label a section with a plate.
- **Don't** use emoji or glyph icons. Icons are lucide-react, inline at 16–24px.
