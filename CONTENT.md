# Content Checklist — Ted & Sherryle

**Build: `index.html` — "Elegant · Timeless · Romantic"** (entrance envelope removed). Based on
`Weddings/samples/envelope/`. Anything not yet supplied reads **`Pending`** on the page or is
hidden entirely — never a made-up value.

```bash
grep -n "Pending\|pending" index.html
```

## Supplied (on the page)
- Groom **Ted Baterna** · Bride **Sherryle Joy Abila**
- Wednesday, **October 28, 2026** · Dipolog City
- Ceremony: **Cathedral Dipolog** · Reception: **Ariana Hotel**
- Attire (principal sponsors + guests) and palette note — verbatim
- Full entourage: principal sponsors, best man / MOH, groomsmen, bridesmaids, bearers,
  flower girls, candle / veil / cord sponsors, readers, psalmist, offerors
- Order of the day — 1:30 PM arrival · 2:00 PM ceremony · 5:00 PM cocktails · 5:30 PM programme · 6:30 PM dinner · 8:00 PM party (countdown targets 2:00 PM)
- **Baptism** of their daughter Thyrelle Loise — intro, gift guide, health protocol
- Gift note — **Option 1** (the highlighted one)
- **Wedding Motif** section — 5 arches cut from the Gemini dress-code illustration (`assets/img/arch-*.jpg`) + all 5 palette colours

## Still needed from the couple
| Item | Where it goes | Current state |
|---|---|---|
| RSVP deadline | RSVP intro | "(date pending)" |
| Parents of the bride & groom | entourage (add a block) | not shown |
| Officiating priest | entourage (optional) | not shown |
| Photos | `PHOTOS` array + `assets/photos/` | gallery hidden |
| Music file | `MUSIC_SRC` + `assets/music/` | title set to "I’ll Be" — Edwin McCain (violin instrumental); player hidden until the file is added |
| Baptism date, time, church | `#baptism` facts | "Pending" |
| Bible verse | invitation card | **placeholder** — 1 Cor 13:13, confirm or replace |
| Hashtag, reminders (plus-ones, unplugged, etc.) | new sections if wanted | not shown |
| Exact cathedral name / venue addresses | venue cards + map queries | map searches "Our Lady of the Most Holy Rosary Cathedral, Dipolog City" — **verify pin** |

## Names to double-check with the couple (typed as received)
- **Mr. Jose Solde** vs **Mrs. Grace Mayor Solder** — Solde or Solder?
- Mrs. **Jucy** Liu, Mr. **Cleifford** Pacatang, **Soffhia** Keith Elnasin — spelling as intended?
- Mrs. Ma. Miljean Santos — trailing "." in the source was dropped.

## RSVP
1. New Google Sheet → Extensions → Apps Script → paste `apps-script/Code.gs`.
2. Run `setup()` once; Deploy ▸ Web app ▸ Execute as **Me**, access **Anyone**.
3. Paste the `/exec` URL into `RSVP_ENDPOINT` in `index.html`.
Until then the form shows success but **saves nothing** (console warns).
Max seats per reply is 2 (form + `CONFIG.MAX_SEATS`).

## Dress-code illustration
Gemini illustration (`image.jpeg`) is used **only** in the Wedding
Motif arches (`assets/img/arch-*.jpg`). It was removed from the Dress Code section to avoid showing
it twice. To regenerate the crops, see THEME.md → Motif section.
