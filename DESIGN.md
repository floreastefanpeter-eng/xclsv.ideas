---
name: SIGNals
description: "Elevul semnează. Clasa înțelege." A red, white and black classroom bridge between a deaf student and a hearing teacher.
colors:
  signal-red: "#d7262b"
  signal-red-deep: "#a81d21"
  signal-red-wash: "#fcebeb"
  signal-red-night: "#ff5a55"
  student-black: "#111111"
  pure-black: "#000000"
  ink: "#0a0a0a"
  ink-raised: "#171717"
  ink-rail: "#2e2e2e"
  white: "#ffffff"
  paper: "#fafafa"
  wash-grey: "#f2f2f2"
  muted-grey: "#f4f4f4"
  hairline: "#e5e5e5"
  input-stroke: "#c7c7c7"
  steel: "#d4d4d4"
  muted-text: "#5c5c5c"
  danger-ink: "#8e1418"
  sem-semneaza: "#1747c4"
  sem-intrebare: "#f2a100"
  sem-inteles: "#13803f"
  sem-neinteles: "#d7262b"
  sem-neutru: "#8a8a8a"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 7.2vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  plate:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.875rem"
    fontWeight: 600
    letterSpacing: "0.12em"
    fontFeature: "'tnum'"
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  2xl: "10.4px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  section: "64px"
  section-lg: "96px"
components:
  nav-bar:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    height: "72px"
    padding: "0 24px"
  nav-bar-scrolled:
    height: "56px"
  nav-bar-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    height: "72px"
  button-primary:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-lg:
    rounded: "{rounded.lg}"
    height: "56px"
    padding: "0 24px"
  button-xl:
    rounded: "{rounded.2xl}"
    height: "64px"
    padding: "0 32px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "4px 10px"
  code-cell:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
  panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  panel-head:
    typography: "{typography.plate}"
    height: "52px"
    padding: "8px 20px"
  label:
    textColor: "{colors.muted-text}"
    typography: "{typography.label}"
  chip:
    backgroundColor: "{colors.wash-grey}"
    textColor: "{colors.pure-black}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  insigna-prof:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "20px"
  insigna-elev:
    backgroundColor: "{colors.student-black}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: SIGNals

## Overview

**Creative North Star: "The Printed Timetable"**

SIGNals is set like a good printed timetable: white paper, black type, one red that you notice because nothing else competes with it. Content sits in sections separated by hairlines and thin rules rather than in floating cards. A section is titled by a short, tight heading on a ruled line, and its metadata (stage numbers, field names, the session tag) sits in small spaced capitals. The conversation is still drawn as a line with stops, a fixed time column and a ring per utterance, because sequence over time is the product. That line is now drawn in red for the teacher and black for the student.

Density is operational and legible. Screens are read on a phone on a desk, on a teacher's phone in a pocket, and from the back row on a projector, so reading type runs large (body 1.125rem, live captions bold, projector captions up to 2.25rem). Every touch target is at least 44px and contrast is high. The shared screens (projector `/clasa`, student desk `/masa`) and the "Conectează un ecran" band on the home page invert to a near-black ground with white type and a lighter red for lines.

Red is never decoration. It marks the primary action, the teacher, the active state and the important line. The only colours outside red, white and black are the four semafor lights on the student status, and each of them always sits beside its text label.

**Key Characteristics:**
- Strictly red, white and black; the four semafor lights are the single, labelled exception.
- Sections and hairline rules instead of cards; one optional 2px red top rule marks the teacher's or primary section.
- Geist throughout, tight negative tracking on headings, Geist Mono for codes and times.
- Small uppercase labels (0.75rem, 600, 0.08em) for metadata only.
- Primary buttons red, hovering to black; secondary buttons white with a thin black border, darkening on hover.
- Conversation as a ruled line: time column, 4px rail, 20px ring stops.
- Fast, subtle motion (200–300ms state changes); everything collapses under `prefers-reduced-motion`.

## Colors

A three-colour editorial palette: one signal red on white paper with black ink, plus a functional semafor set that never appears without words.

### Primary
- **Signal Red** (signal-red): the brand and every primary action (default button, mic button when off, "Intră", "Conectează"), the teacher's identity (teacher rail and ring, teacher Insigna, teacher avatar), active navigation underlines, the 2px top rule of the primary Panel, the focused code cell, the live-state dot, the text caret, and the "Nu înțeleg" semafor light. It is also the `destructive` colour and the only "attention" colour: the token named amber in code resolves to this red.
- **Signal Red Deep** (signal-red-deep): small red text on white (teacher speaker names, "În desfășurare") where full red is too light for bold small type.
- **Signal Red Wash** (signal-red-wash): the row tint of the teacher's active lesson and the fill of error lines.
- **Signal Red Night** (signal-red-night): red on near-black grounds: rails, the live-phrase dashed rail, the focused code cell on dark, legend strokes on the projector.

### Neutral
- **Ink** (ink): all foreground text, the dark band ground, the global focus outline, the hover state of every red button, segmented toggles in their selected state.
- **Student Black / Pure Black** (student-black, pure-black): the student's identity colour (student rail and ring, student Insigna, the student's "Intră în lecție" block, student avatars). The code still calls these `elev`; the role kept its name when blue was removed.
- **Ink Raised / Ink Rail** (ink-raised, ink-rail): layered strips on the desk screen and the scrollbar on dark surfaces.
- **White** (white): the page, panels, inputs, nav bar, secondary buttons.
- **Paper** (paper): alternate full-bleed section ground (the pipeline demo band) and unselected choice tiles.
- **Wash Grey / Muted Grey** (wash-grey, muted-grey): student active-row tint, chips, secondary buttons, ghost hover; the neutral `warn-soft` and `ok-soft` status fills use these same greys.
- **Hairline** (hairline): every border and separator by default.
- **Input Stroke / Steel** (input-stroke, steel): input strokes, empty station dots, inactive rails, scrollbars.
- **Muted Text** (muted-text): secondary text, help lines, timestamps, labels.
- **Danger Ink** (danger-ink): bold error text on the red wash.

### Semafor (the only colour exception)
- **Semnează** (sem-semneaza, blue), **Întrebare** (sem-intrebare, yellow), **Înțeles** (sem-inteles, green), **Nu înțeleg** (sem-neinteles, the brand red), **Neutru** (sem-neutru, grey, also the projector's station colour on the line map). These appear only as semafor LEDs, the semafor grid and the semafor label on an Insigna.

### Named Rules
**The One Red Rule.** Red means action, teacher, active or important. If an element is none of those, it is black, white or grey. Never use red as a background wash for decoration.

**The Labelled Light Rule.** A semafor colour never appears without its text label. Colour reinforces meaning; it never carries it alone, and no semafor colour is used outside the semafor.

**The Night Red Rule.** On near-black grounds, lines and focus marks switch to Signal Red Night. Full Signal Red stays for solid fills that carry white text.

## Typography

**Display Font:** Geist (Latin, Latin Extended, Cyrillic), falling back to system-ui
**Body Font:** Geist
**Label/Mono Font:** Geist Mono, for lesson codes, times and counters

**Character:** One neutral grotesk carries the whole system; hierarchy comes from size, weight and tracking, not from a second face. Headings are pulled tight (−0.03 to −0.055em) and balanced; body text has stylistic sets `ss01` and `cv11` on.

### Hierarchy
- **Display** (600, clamp(2.9rem, 7.2vw, 6rem), line-height 0.95, −0.055em): the home slogan only, its second line in Signal Red.
- **Headline** (600, 1.875rem → 2.25rem; page titles 2.25rem → 3rem, −0.035em): section headings ("Cum circulă o frază", "Conectează un ecran") and page titles ("Bună, Ana", "Ce ecran e acesta?").
- **Plate** (650, 1.05–1.125rem, line-height 1, −0.025em, sentence case): Panel titles and short section titles; larger (1.5–2.25rem) inside an Insigna or a choice row.
- **Title** (600, 1.25rem, leading tight): list-row titles (lessons, dashboard stops).
- **Caption** (700, 1.125rem; 1.25–1.5rem at lg; 1.875–2.25rem on the projector, leading snug): conversation text. A translation takes the bold line, and the Romanian original sits beneath in regular weight behind a small "RO" tag.
- **Body** (400, 1.125rem → 1.25rem, leading relaxed, max ~34–42rem): explanatory prose, at 70% ink.
- **Label** (600, 0.75rem, 0.08em, uppercase): metadata: field captions, stage numbers and names, the session tag, menu titles, language tags.
- **Code** (Geist Mono 600, tabular, 0.12em): the 6-character lesson code (1.5–1.875rem in cells), list-row times at tighter tracking, percentages.

### Named Rules
**The Metadata Caps Rule.** Uppercase belongs to the small label style and nothing else. Headings, plates and reading text stay in sentence case.

**The Bold Caption Rule.** Anything a person must read live (captions, stop text, statuses) is set in 700. Regular weight is for supporting text.

## Layout

A single 80rem (max-w-7xl) column with 16px gutters, widening to 24px from 640px. Marketing sections are full-bleed bands separated by 1px rules, alternating white, paper and ink, with 64px vertical padding (96px from 1024px). Working screens split at 1024px into a fixed action column (25–26rem) and a fluid content column; below that they stack with the action first. The pipeline demo is five columns from 768px and a vertical list below. The projector screen splits at 1280px into a fluid conversation and a 26rem side column.

Conversations use a three-column grid: time (2.9rem; 3.4rem from 640px; 5rem on the projector), rail (1.5–2.25rem) and text. Lists are rows divided by hairlines, never stacks of boxes. On phones the teacher's primary control lives in a fixed bottom bar (white at 95% with a blur, padded for the safe area). Shared screens fill the viewport (min-h-dvh).

Spacing runs on a 4px base: 8px and 12px gaps inside components, 16px/20px section padding, 24px between blocks.

## Elevation & Depth

Flat by default. Depth comes from hairlines, from the paper/white/ink alternation of bands, and on dark screens from white at 4–6% for inset areas. Shadows are soft, neutral black, pulled under the object with a negative spread, and appear mainly in response to state.

### Shadow Vocabulary
- **Scroll lift** (`box-shadow: 0 8px 24px -20px rgba(10,10,10,0.35)`): the nav bar once the page scrolls, together with 80% white and a backdrop blur.
- **Selection lift** (`box-shadow: 0 6px 18px -14px rgba(10,10,10,0.6)` / `0 10px 30px -18px rgba(10,10,10,0.45)`): the selected role tile in the auth form and the active pipeline stage.
- **Sheet lift** (`box-shadow: 0 1px 0 rgba(10,10,10,0.04), 0 24px 48px -32px rgba(10,10,10,0.35)`): the home auth sheet, the one resting surface allowed to lift.
- **Notice lift** (Tailwind `shadow-lg` / `shadow-2xl`): blocking notices and the buzz banner, which overlay the screen.
- **Button rest** (`box-shadow: 0 1px 0 rgba(10,10,10,0.08)`): the primary button's 1px base line.

### Named Rules
**The Flat-By-Default Rule.** Panels, rows, chips and plates are flat. A shadow marks scroll, selection or an overlay. Never a hard offset shadow, never a coloured glow.

## Shapes

Gently squared corners on a 0.5rem base: 4.8px for chips and small tags, 6.4px for inputs, code cells and links, 8px for buttons, panels, tiles and Insignas, 10.4px only on the 64px button. Round is reserved for things that are round by meaning: station rings (20px, 4px border), avatars, status dots, LEDs, progress tracks, voice-wave bars. Lines are 4px for rails and the line map, 1px for separators, 2px for the active underline and the primary Panel's top rule. The live phrase is a dashed rail (8px dash, 6px gap).

## Components

### Navigation (nav bar)
Character: quiet paper header. White, sticky, 72px tall (64px on phones) with a transparent bottom border; after 8px of scroll it shrinks to 56px, turns 80% white with a backdrop blur, and gains a hairline and the scroll lift (300ms). Logo left (official mark plus wordmark image), a flexible centre slot for the current context (lesson code, panel name), account or links right. Links are 0.875rem medium at 70% ink; hover darkens to ink and draws a 2px red underline from the left (300ms); red marks the active tab. On phones the links move into a right-side sheet of 56px rows split by hairlines. The dark variant (projector, desk) is ink with a white/10 border, the app icon and a white "SIGN"-bold, "als"-light wordmark.

### Buttons
- **Shape:** 8px corners (10.4px at xl).
- **Primary:** Signal Red with white text, 44px tall, 16px padding, 1rem medium; hover goes to ink (200ms).
- **Secondary (outline):** white with a 1px black border at 20%, ink text; hover takes the border to full ink. Heavier actions ("Termină lecția") use a 2px ink border.
- **Sizes:** default and sm are 44px, lg is 56px (1.125rem semibold), xl is 64px (1.25rem bold), icon is 44px. No target is smaller than 44px.
- **Focus / Press:** focus draws a 4px ink ring at 60% with a 2px offset; press nudges down 1px. Disabled is 50% opacity.
- **Ghost:** transparent, grey hover; used for the mobile menu trigger.

### Panels (sections)
Character: a ruled section, not a card. White body with a 1px hairline and 8px corners; a 52px head row holds a plate title, an optional 20px icon at 60% ink, and an optional action on the right, separated from the body by a hairline. The primary or teacher Panel adds a 2px Signal Red rule along its top edge. On dark screens the body is white at 4% with a white/12 border.

### Inputs / Fields
- **Style:** white fill, 1px stroke (ink at 15%, or the input stroke), 6.4px corners, 48px tall in forms, 1rem text. Native `<select>` is styled the same.
- **Focus:** the border goes to ink with a soft ink ring; hover deepens the border to 30% ink.
- **Error:** a line under the field group: red wash fill, 1px red border at 30%, bold danger-ink text, `role="alert"`.

### Session Terminal (signature)
The lesson code is entered into six mono cells (aspect 4:5, 1.5–1.875rem) over a real, invisible text input. Empty cells have a hairline; filled cells a black border; the current cell a red border with a blinking caret. A status line beneath names the state with a dot and words: "Aștept codul · 3/6" (grey dot), "Gata de conectare" (red dot, pulsing), "Se conectează…" (spinner on the button). On the ink band it reads with white/15 borders and a night-red current cell.

### Pipeline Demo (signature)
The flow PROFESOR → VOCE → TEXT → TRADUCERE → ELEV, and the reverse direction from a segmented toggle. Each stage is a 42px round icon node, a label with a mono stage number, and a white tile with a hairline. Connectors between stages are 1px hairlines that fill red as the phrase passes (500ms). The active stage turns its node ink with a red dot; done stages show a check. Clicking a stage pauses on it and explains it in a ruled caption row below. Under reduced motion the demo shows its final state.

### Route Stop (signature)
One message as a stop: fixed time column, a 4px rail segment in the speaker's colour (red teacher, black student, steel system), a 20px ring (white centre, filled when the stop raises an alert), then the speaker line (icon, name, chips) and the bold caption. System stops are small 14px stops on a steel rail. The phrase being spoken is a dashed red rail with an italic muted caption and a blinking ring. New stops slide in 10px from the left (380ms) and the ring pulses once on arrival.

### Line Map
The lesson's devices as stations on a 4px horizontal line, each segment in the colour of its outgoing line. Dots are 20px with a 4px ring: filled means connected, hollow means not, and a 2px offset ring marks "Ești aici". A "Reconectare…" tag in red appears before the map when the connection drops.

### Insigna
The person badge at the top of the teacher and student screens: a solid red (teacher) or black (student) block with 8px corners, a 56–64px semafor LED with a white 85% rim, the name in plate type at 1.875–2.25rem, and the semafor label in bold. An alert adds a 4px red ring.

### Semafor
Four labelled lights in a 2×2 grid (1×4 from 640px). The active light gets a 2px ink border (white on dark) and its LED pulses; inactive lights fade to 45% text with the LED at 28%.

### Chips
4.8px corners, 2px × 6px padding, 0.75rem text, optional 14px icon, grey wash with black text (white at 12% on dark).

## Do's and Don'ts

### Do:
- **Do** keep every surface to red, white and black; the four semafor lights are the only other colours, always with their label.
- **Do** separate content with sections, 1px hairlines and full-bleed bands; use the 2px red top rule only for the primary or teacher section.
- **Do** make primary actions Signal Red, hovering to ink in 200ms; make secondary actions white with a thin black border.
- **Do** mark the active navigation item or tab with a 2px Signal Red underline.
- **Do** set metadata in the small label style (0.75rem, 600, 0.08em, uppercase) and nothing else in caps.
- **Do** draw any sequence over time (messages, lessons, dashboard stops, device choices) as stops on a 4px rail with 20px rings and a fixed time column.
- **Do** keep every interactive target at 44px or more and live-read text at 1.125rem 700 or larger.
- **Do** respect `prefers-reduced-motion`: animations collapse to an instant frame, the demo shows its final state, and only the functional 1.5s confirm bar keeps its duration.

### Don't:
- **Don't** use gradients, neon, glows or glassmorphism as decoration. Backdrop blur is for the scrolled nav, the phone control bar and the camera privacy cover only.
- **Don't** make floating cards the default container. A section with a hairline is the default; shadows mark scroll, selection or overlays.
- **Don't** round containers past 8px or make buttons and toggles pill-shaped. Round is for rings, dots, avatars, LEDs and tracks.
- **Don't** introduce blue, yellow or green outside the semafor, and don't reintroduce a separate attention colour: attention is red.
- **Don't** use hard offset shadows or decorative shapes.
- **Don't** use a second or futuristic display face. Geist and Geist Mono only.
- **Don't** use emoji or glyph icons. Icons are lucide-react at 16–24px.
- **Don't** redraw or recolour the official logo; on black use the app icon and the white wordmark.
