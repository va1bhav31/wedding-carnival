---
name: Wedding Carnival (marketing site)
description: The public site for weddingcarnival.live, painted as a hand-lettered Bollywood cinema hoarding on a night street.
colors:
  ink: "#2c2723"
  ink-soft: "#4a433d"
  pink: "#ff66c4"
  yellow: "#fff800"
  white: "#ffffff"
  paper: "#fffdf6"
  on-ink-soft: "#d9d3cd"
  bulb-core: "#fffbd2"
  ink-hover: "#3a332e"
  yellow-hover: "#fffb5c"
typography:
  display:
    fontFamily: "Shrikhand, Georgia, serif"
    fontSize: "clamp(3.5rem, 8.6vw, 6.25rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Shrikhand, Georgia, serif"
    fontSize: "clamp(2.5rem, 6.4vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "0.005em"
  title:
    fontFamily: "Shrikhand, Georgia, serif"
    fontSize: "clamp(1.75rem, 3.6vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.12
  title-set:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.2
  lede:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.6
  stamp:
    fontFamily: "Mukta, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.08em"
rounded:
  stamp: "4px"
  board: "4px"
  ticket: "6px"
  input: "12px"
  card: "16px"
  scene: "18px"
  pill: "999px"
spacing:
  gutter: "clamp(18px, 4vw, 40px)"
  wrap: "1200px"
  section: "clamp(72px, 10vw, 128px)"
  frame: "22px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.yellow}"
    rounded: "{rounded.pill}"
    padding: "0 30px"
    height: "56px"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
  button-yellow:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 30px"
    height: "56px"
  button-yellow-hover:
    backgroundColor: "{colors.yellow-hover}"
  button-line:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 30px"
    height: "56px"
  name-slot:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "0 16px"
    height: "52px"
  ticket:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ticket}"
    padding: "26px 26px 30px"
  stamp:
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: "9px 14px 7px"
  plaque:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.ticket}"
    padding: "6px 12px"
---

<!-- Scope: this file describes the public MARKETING SITE only (source in redesign/site/, published from docs/: docs/index.html is the cover, docs/demo.html the homepage). It does NOT govern the guest game app in apps/web, which is a separate visual world. -->

# Design System: Wedding Carnival (marketing site)

## Overview

**Creative North Star: "The Hand-Painted Hoarding"**

The site is a single-screen cinema's hoarding on a night street, and the couple's wedding is the picture it bills. A warm charcoal street surrounds flat, hand-painted fields of pink and yellow; titles are sign-painter lettering with a stepped painted shade; the stars are the bride and groom, billed at hoarding scale and cropped by the board's edge. Everything is flat paint: no gradients on surfaces, no photography, no glass.

The world is loud in colour and quiet in ornament. Exactly two repeatable units decorate it, the marquee bulb row and the ticket stub, and state is never carried by a hue change alone: it is stamped on. The visitor's own names re-letter the billing, so the hoarding is always about them.

Density is low and poster-like: one statement per field, ranked by field size, generous section rhythm on the charcoal between fields.

**Key Characteristics:**
- Logo palette only: charcoal, pink, yellow, white, plus paper for tickets.
- Shrikhand for painted titles, Mukta for everything read.
- Two ornament units only: bulb row and ticket stub.
- State is a stamped mark that thumps down once.
- The visitor's names re-letter the surface live.
- Every booking action is an email to info@weddingcarnival.live.

## Colors

A night street and two painted fields: the logo's own charcoal, pink and yellow at full saturation, with white for set copy and a warm paper for tickets.

### Primary
- **Hoarding Pink** (pink): the hero board field and the packages field; the right-answer card in the scene; the shade under white lettering on charcoal; feature bullets and the ticket holes on the pink field; the bride's share of the crowd bar.

### Secondary
- **Marquee Yellow** (yellow): the scene field, the closing field and the cover's teaser field; the star disc behind the portraits on pink; lit bulbs; the yellow pill on charcoal; time stamps in the programme; the focus ring on charcoal; text selection.

### Neutral
- **Night-Street Charcoal** (ink): the page ground, the header, all painted lettering on pink and yellow, field borders and rules, the charcoal pill, the groom's share of the crowd bar.
- **Wet-Paint Charcoal** (ink-hover): the charcoal pill's hover only.
- **Soft Charcoal** (ink-soft): secondary copy on paper tickets and on yellow (ticket body, scene role line).
- **Set White** (white): set copy on charcoal, the logo plaque, name-slot fills, the white painted shade on yellow, the hero and cover stamp fills.
- **Ticket Paper** (paper): ticket stubs, scene cards, the crowd bar track, the verdict stamp fill.
- **Street-Lamp Grey** (on-ink-soft): ledes, captions and footer copy on charcoal.
- **Bulb Filament** (bulb-core): the pale core of every lit bulb; nothing else.
- **Highlighter Yellow** (yellow-hover): the yellow pill's hover only.

### Named Rules
**The Logo Palette Rule.** The palette is the logo's charcoal, pink and yellow, with white and paper. No new hues, no tints of pink or yellow as surfaces, no gradients across a field.

**The Full-Ink-On-Pink Rule.** On the pink field, read copy is full charcoal. Soft Charcoal is for paper and yellow only (it falls under 4.5:1 on pink).

## Typography

**Display Font:** Shrikhand (self-hosted woff2, Georgia fallback)
**Body Font:** Mukta 400 / 600 / 800 (self-hosted woff2, system-ui fallback)

**Character:** Shrikhand is the sign painter's brush: fat, swashy, unmistakably Indian-poster. Mukta is the printed programme beside it: plain, sturdy, readable at any size on a phone.

### Hierarchy
- **Display** (Shrikhand 400, clamp(3.5rem, 8.6vw, 6.25rem), 0.98): the one hero title per field ("Every guest plays.", "Your wedding. Now showing." at up to 6.5rem).
- **Headline** (Shrikhand 400, clamp(2.5rem, 6.4vw, 4.75rem), 0.98): section titles; the scene question at clamp(2rem, 5vw, 3.5rem).
- **Title** (Shrikhand 400, clamp(1.75rem, 3.6vw, 2.5rem)): the star billing line, show names in the programme, package names (2.5rem), the scene's name plates.
- **Set Title** (Mukta 800, 1.375rem, 1.2): ticket headings and the scene result line.
- **Lede** (Mukta 400, 1.25rem; 600 on painted fields): section ledes, max 34-40rem.
- **Body** (Mukta 400, 1.125rem, 1.5): all running copy; feature lists at 600.
- **Label** (Mukta 600, 0.9375rem, 1.6): captions, slot labels, the credits block (bold names at 800).
- **Stamp** (Mukta 800, 0.875rem, 0.08em, uppercase): stamped marks only. Uppercase is reserved for stamps.

### Named Rules
**The Painted Shade Rule.** Shrikhand titles are charcoal with a flat, stepped shade of 1px offsets down-right: 6 steps of yellow on pink, 5 of white on yellow, 6 of pink on yellow when the field needs heat. On charcoal the lettering turns white with 4 steps of pink. Small painted numerals take 2 steps. Never a blurred shadow, never a gradient fill.

**The Read-In-Mukta Rule.** Anything a visitor reads to understand (ledes, steps, features, captions, buttons, labels) is Mukta. Shrikhand is for what is billed, not explained.

## Layout

A centred wrap (1200px max, gutter clamp(18px, 4vw, 40px)) on the charcoal street. Sections breathe at clamp(72px, 10vw, 128px) vertical padding. Painted fields are either full-bleed bands (packages, closing, cover) or contained boards inside the wrap (the scene).

The hero is a framed board: the pink field sits inside a 22px charcoal margin, the header's bulb row is its top edge, and bulbs trace its sides and foot. The stars sit absolutely on the right half, cropped by the board's edge; a credits block closes the board under a 3px charcoal rule. At 860px and below the grid stacks to one column and the stars move into flow at 118% width, still cropped. At 480px the name slots become a three-column grid (name, ampersand, name).

Ticket rows run three across and stack to one (max 520px) at 860px. The programme is a two-column list (13rem time column) that stacks at 700px. Navigation links hide at 760px, leaving the logo plaque and the booking pill.

## Elevation & Depth

Flat. There are no box-shadows anywhere in the system. Depth comes from paint and framing: fields sit on the charcoal street, the stars break out of the board edge, and Shrikhand carries its stepped painted shade. Selection and emphasis use outlines (4px charcoal) and stamps, never lift.

### Named Rules
**The Flat Paint Rule.** No box-shadow, no blur, no glass. The only offset is the hard stepped text shade on painted lettering, which is the sign painter's own device.

## Shapes

Mostly square-shouldered paint with soft corners: boards and stamps at 4px, tickets and the plaque at 6px, name slots at 12px, scene cards at 16px, the scene field at 18px, and every action a full pill. Borders are 3px solid charcoal (slots, scene cards, crowd bar, stamps in currentColor). Two recurring silhouettes: the circle (bulbs, the star disc, ticket notches, feature dots) and the ticket stub's notched edge.

## Components

### Buttons
Fat painted pills, one per field.
- **Shape:** full pill (999px), 56px tall, 30px side padding, 3px border; Mukta 800 at 1.125rem.
- **Charcoal pill:** charcoal with yellow text, the action on pink and yellow fields; hovers to Wet-Paint Charcoal.
- **Yellow pill:** yellow with charcoal text, the action on the charcoal street (header); hovers to Highlighter Yellow. The header version is 46px tall.
- **Line pill:** transparent with a currentColor border, for secondary packages.
- **Press:** translateY(1px) scale(0.985). **Focus:** 3px yellow outline at 3px offset on charcoal, charcoal outline on pink and yellow.
- **Text link:** Mukta 800 with a 2px underline at 5px offset, for the quiet second action ("Play a scene first", "Take a sneak peek").
- Every booking action is a mailto to info@weddingcarnival.live.

### Stamped Mark (signature)
- **Style:** Mukta 800 uppercase, 3px currentColor border, 4px corners, rotated -5deg, filled to sit on its field (white on pink or yellow, yellow or paper on cards).
- **Use:** state and billing only: Now booking, Coming this wedding season, Right answer, Your pick, Most popular, Signature.
- **Motion:** thumps down once (520ms, from 1.9x scale and -12deg, 300ms delay); reduced motion shows it already landed.

### Ticket Stub (signature)
- **Style:** paper, 6px corners, 26px padding, a 22px circular notch on each side at the tear line, the notch filled with the field colour behind it; a 2px dashed tear line in 35% charcoal.
- **Use:** the steps of how the show runs (with a pink-shaded painted numeral) and the packages. The featured package carries a 4px inset charcoal outline and a stamp.

### Marquee Bulb Row (signature)
- **Style:** 14px row of 8px lit bulbs on a 24px pitch, each with a Bulb Filament core inside a yellow ring. A dim variant (26% white) closes the footer.
- **Frame:** on the hero board, bulbs run down both sides and along the foot with background-repeat: space, so only whole bulbs show.
- **Motion:** the header row chases in two steps over 1.6s; reduced motion holds still.

### Inputs / Name Slots
- **Style:** white fill, 3px charcoal border, 12px corners, 52px tall, Mukta 800 at 1.125rem; label above in Mukta 600. Placeholder is the sample name in a warm grey.
- **Focus:** charcoal outline on the pink field.
- **Behaviour:** typing re-letters every billed name on the page (hero billing, scene name plates, crowd legend) and the booking email subject, live; empty falls back to the sample names.

### Navigation
- **Style:** sticky charcoal marquee bar, 78px row: the logo on a white plaque, Mukta 600 links in white hovering to yellow, a yellow booking pill; the chasing bulb row underneath.
- **Mobile:** links hide at 760px; plaque and pill remain.

### Playable Scene
- **Style:** a yellow field holding a white-shaded question and two paper cards (portrait, Shrikhand name, role line).
- **States:** the right side turns pink and receives a Right answer stamp plus a pair of pixel sunglasses that drop onto the portrait; the visitor's pick gets a 4px charcoal outline and a yellow Your pick stamp. Marks sit under the name, never on the faces. A pill-shaped crowd bar (pink and charcoal on paper) and a text replay link follow. The whole scene is captioned as sample.

## Do's and Don'ts

### Do:
- **Do** letter every billed title in charcoal Shrikhand with the stepped shade matched to its field (yellow on pink, white or pink on yellow, white-with-pink on charcoal).
- **Do** carry state with a stamp (Mukta 800 uppercase, 3px border, -5deg) that thumps once; hold it still under reduced motion.
- **Do** draw ornament from the bulb row and the ticket stub only; keep frame bulbs whole with background-repeat: space.
- **Do** use the charcoal pill with yellow text on pink and yellow fields, and the yellow pill on charcoal; point every booking action at info@weddingcarnival.live.
- **Do** let the visitor's names re-letter the billing, the scene and the email subject.
- **Do** caption every sample element (names, scene, crowd split, timings) as sample.
- **Do** keep read copy full charcoal on pink.

### Don't:
- **Don't** add hues outside the logo palette, or gradients, blurs or box-shadows on any surface.
- **Don't** introduce a third ornament unit, or emoji and font-glyph symbols in place of drawn marks.
- **Don't** signal state by colour alone; a pink card without its stamp is not a right answer.
- **Don't** set read copy in Shrikhand, or uppercase anything that isn't a stamp.
- **Don't** add testimonials, press logos or claims the business can't back.
- **Don't** loop motion loudly: the bulbs chase, the stamps land once, and that is all.
