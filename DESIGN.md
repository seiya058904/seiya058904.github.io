---
name: Seiya's Personal Tech Portfolio
description: A clear, credible personal technology portfolio with restrained elegance and technical depth
colors:
  portfolio-ink: "#18232d"
  portfolio-muted: "#586976"
  portfolio-accent: "#0b6f9f"
  portfolio-accent-strong: "#07577e"
  portfolio-line: "rgba(24, 50, 67, 0.12)"
  portfolio-line-strong: "rgba(24, 50, 67, 0.2)"
  surface: "#ffffff"
  parchment: "#f5f5f7"
typography:
  display:
    fontFamily: "\"Noto Serif SC\", \"Source Han Serif SC\", \"Songti SC\", \"STSong\", \"SimSun\", \"Cormorant Garamond\", \"Bodoni Moda\", \"Iowan Old Style\", \"Palatino Linotype\", \"Book Antiqua\", serif"
    fontSize: "clamp(2.2rem, 3.4vw, 3.4rem)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.018em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.47
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.76rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.portfolio-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.portfolio-accent-strong}"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.92)"
    textColor: "{colors.portfolio-ink}"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "22px"
  card-hover:
    transform: "translateY(-2px)"
    boxShadow: "0 4px 8px rgba(24, 50, 67, 0.06)"
---

# Design System: Seiya's Personal Tech Portfolio

## 1. Overview

**Creative North Star: "展现个人，又不失精美的制作"**

This design system embodies a technical craftsman's workspace — clean, precise, and warm without being decorative. The portfolio showcases personal work with the restraint of Apple's design language but adds subtle warmth through serif typography and thoughtful spacing. It rejects generic AI SaaS styling, excessive glass effects, nested cards, and decorative motion.

**Key Characteristics:**
- Restrained elegance with technical depth
- Serif display typography for personality
- Deep teal-blue accent as the signature color
- Flat, shadowless cards with subtle borders
- Touch-friendly with 44px minimum targets

## 2. Colors

The palette is built around a deep sea-teal accent that conveys technical credibility without coldness.

### Primary
- **Deep Sea Teal** (#0b6f9f): The signature color. Used sparingly on primary CTAs, active filter states, and hero links. Its rarity is the point — it signals importance without shouting.

### Accent Strong
- **Deepened Teal** (#07577e): Hover and focus state for primary elements. Never used at rest.

### Neutral
- **Portfolio Ink** (#18232d): Primary text color. Darker than pure black, it reads as refined.
- **Portfolio Muted** (#586976): Secondary text, labels, captions. Maintains WCAG AA contrast against white.
- **Surface** (#ffffff): Card and panel backgrounds.
- **Parchment** (#f5f5f7): Page background, subtle differentiation from cards.

### Named Rules
**The Rarity Rule.** The primary accent is used on ≤10% of any given screen. Its rarity is the point.

**The Flat-By-Default Rule.** Cards and panels are flat at rest. Shadows appear only as a response to hover state, never as decoration.

## 3. Typography

**Display Font:** Noto Serif SC (with Cormorant Garamond, Bodoni Moda fallback)
**Body Font:** System sans-serif stack (-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "Microsoft YaHei")

**Character:** The serif display face adds personality and warmth to an otherwise technical interface. It's used with restraint — only on headings and major UI elements. The system sans-serif body text ensures readability and performance.

### Hierarchy
- **Display** (500, clamp(2.2rem, 3.4vw, 3.4rem), 1.08): Section titles, hero headlines. Letter-spacing: -0.018em.
- **Headline** (500, clamp(1.65rem, 2.1vw, 2.3rem), 1.1): Card titles, sub-sections.
- **Title** (600, 1.5rem, 1.2): About card headings, feature titles.
- **Body** (400, 17px, 1.47): Paragraph text. Max line length: 60-66ch.
- **Label** (700, 0.76rem, 1, 0.14em tracking, uppercase): Kicker text, meta labels, category tags.

### Named Rules
**The Serif Restraint Rule.** Display serif is reserved for headings and major UI elements. Body text, navigation, and UI controls use the system sans-serif for clarity and performance.

## 4. Elevation

The system is intentionally flat. Cards, panels, and containers sit directly on the page with subtle 1px borders rather than shadows.

### Shadow Vocabulary
- **Hover Lift** (`box-shadow: 0 4px 8px rgba(24, 50, 67, 0.06)`): Appears only on card hover. The only shadow in the system.
- **No Default Shadows.** Cards at rest have `box-shadow: none`. This is deliberate — the flat aesthetic reads as clean and technical.

### Named Rules
**The Border-Over-Shadow Rule.** Depth is communicated through 1px borders with low opacity (`rgba(24, 50, 67, 0.12)`) rather than drop shadows. Shadows are reserved for hover feedback only.

## 5. Components

### Buttons
- **Shape:** Pill-rounded (999px radius)
- **Primary:** Deep teal background (#0b6f9f), white text, 11px 22px padding. Hover: deepened teal (#07577e).
- **Ghost:** White background with subtle border, dark text. Hover: border tints toward accent.
- **Small:** Same ghost style, used in card actions and PPT cards.
- **Focus:** 3px box-shadow ring in accent color at 12% opacity.

### Cards / Containers
- **Corner Style:** 16px radius (consistent across all card types)
- **Background:** Pure white (#ffffff)
- **Shadow Strategy:** Flat at rest, subtle lift on hover (4px 8px spread)
- **Border:** 1px solid rgba(24, 50, 67, 0.12)
- **Internal Padding:** 22px standard, 24px for project cards

### Hero Section
- **Layout:** Mosaic grid with intro card, project card, and stat cards
- **Stat Cards:** Display serif numbers (clamp(2.7rem, 4vw, 3.8rem)), muted label text
- **Image Links:** Frosted glass buttons overlaid on hero images with backdrop-filter

### Navigation
- **Style:** Sticky header with 55% white background and 24px backdrop blur
- **Typography:** System sans-serif, 0.92rem, weight 500
- **States:** Hover darkens text, no background change
- **Mobile:** Dropdown with slide-in animation, full-width links

### Tags / Chips
- **Style:** Pill-rounded (999px), light gray background (#f3f7f9), muted text
- **Border:** 1px solid portfolio-line
- **No hover states** — tags are informational, not interactive

### Like Button
- **Shape:** Pill-rounded, minimum 44×44px touch target
- **States:** Default (white), hover (border tints accent), active (pressed), liked (accent border + background)
- **Icon + Count:** Inline flex with 7px gap

## 6. Do's and Don'ts

### Do:
- **Do** use the display serif only for headings and major UI elements — body text stays sans-serif.
- **Do** keep cards flat at rest — shadows appear only on hover.
- **Do** use the primary accent sparingly — ≤10% of any screen.
- **Do** maintain 44px minimum touch targets for all interactive elements.
- **Do** use 1px borders with low opacity to define card boundaries.
- **Do** keep line length between 60-66ch for body text.
- **Do** use text-wrap: balance on headings for even line lengths.

### Don't:
- **Don't** use generic AI SaaS styling, large purple-blue gradients, or excessive glass effects.
- **Don't** nest cards inside cards — flat hierarchy only.
- **Don't** add decorative motion — animations are functional feedback only.
- **Don't** use shadows at rest — they're reserved for hover states.
- **Don't** use the accent color on large surfaces — it's for CTAs and active states only.
- **Don't** pair two similar sans-serif fonts — use serif + sans contrast.
- **Don't** use numbered section markers (01/02/03) unless content is actually sequential.
