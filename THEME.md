# Ted & Sherryle — Theme & Style Guide

**Envelope invitation · Elegant, Timeless, Romantic.** A dusty-blue envelope sealed with gold wax
opens to a navy-and-ivory invitation — lifted straight from `motif.png` (navy card, gold seal,
ivory roses, taper candles).

## Palette (from motif.png)
| Token | Hex | Role |
|---|---|---|
| `--navy` | `#1A2A44` | Hero, countdown, gifts, headings, ink |
| `--dusty` | `#5A728A` | Envelope, accent words, buttons hover |
| `--dusty-deep` | `#4D647B` | Small labels on light stock (5.4:1 on ivory) |
| `--sand` | `#C8B7A6` | Rules, petals, eyebrows on navy |
| `--ivory` | `#F6F1EB` | Page stock |
| `--white` | `#FFFFFF` | Cards, invitation |
| `--gold` | `#B89B6A` | Wax seal + ✦ ornaments **only** |

Plain `--dusty` on ivory is 4.4:1 — fine for large type, not for small caps; use `--dusty-deep`.
`--ink-muted` `#5E6878` is 4.9:1 on ivory.

## Motif section
Heading, one intro line, and the five palette chips (navy, dusty blue, sand beige, ivory, soft white).
The arch photo row was removed on 2026-10-06; the outfit imagery now lives in the Dress Code cards.

## Type
Great Vibes (script names/monogram) · Playfair Display (titles, italic accents) · Cinzel (letter-spaced
labels) · Cormorant Garamond 500 (body, 19px). `lining-nums` is set globally — Cormorant/Playfair
old-style figures made the countdown jump and "1" read as "I".

## Motion
Envelope open (flap rotateX + delayed z-index drop so the letter passes in front) → overlay fades at
1.1s. Falling sand/ivory petals, IntersectionObserver reveals, gentle float on ornaments. Nothing
scroll-jacked.

## Contracts
- Reveal classes only hide content under `html.js`; no JS → everything visible.
- `prefers-reduced-motion`: animations off, petals removed, reveals shown, marquee becomes a scroller.
- Gallery marquee uses `margin-right`, not `gap` (gap drifts the -50% loop).
- `esc()` is a real HTML escaper (the sample's was a no-op).
- Envelope is a `<button>` (keyboard-openable); tabs are ARIA tabs with arrow-key support.
