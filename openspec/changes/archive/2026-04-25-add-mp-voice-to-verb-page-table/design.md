## Context

`engine.table()` returns a tense-keyed map whose values are person/number-keyed maps. Each cell's key is `<cell>.<voice>` — e.g., `1sg.active`, `1sg.middle-passive`. The current `<ConjugationTable>` reads only the active key (`conjugation-table.tsx:78`), discarding MP. This change makes MP visible without altering the engine.

## Goals / Non-Goals

**Goals:**

- Render MP forms inline in the verb page's existing conjugation table.
- Preserve existing active-row anchor IDs (back-compat for deep-links).
- Skip MP rows for tenses where no MP cell exists.
- Keep the table semantic and accessible (textual voice marker, role-coded segments).

**Non-Goals:**

- No voice toggle / filter UI.
- No engine work.
- No re-architecture of `ConjugationTable` props.
- No restyling of active rows.

## Decisions

### D1. Row-pair-per-tense layout

For each tense `T` in the mood:

```
┌──────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ T                    │  1sg │  2sg │  3sg │  1pl │  2pl │  3pl │
│ T  (MP)              │  ... │  ... │  ... │  ... │  ... │  ... │
├──────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ T'                   │  ... │  ... │  ... │  ... │  ... │  ... │
│ T' (MP)              │  ... │  ... │  ... │  ... │  ... │  ... │
└──────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

The MP row is omitted entirely when no MP cell exists for the tense. The label cell of the MP row contains the tense name plus a small `MP` badge.

```
                       │ <span>imperfect</span>                     │
                       │ <span>imperfect</span>                     │
                       │ <span class="...muted">MP</span>           │
```

The badge uses the same Tailwind palette as the existing tense label but in a slightly muted variant (e.g., `text-stone-400 ml-2 text-[10px] uppercase`). It's text — not an icon — so screen readers announce "imperfect MP" naturally.

### D2. Anchor ID format

Active cells: `<mood>-<tense>-<cell>` (unchanged).
MP cells:    `<mood>-<tense>-<cell>-mp`.

This preserves existing deep-links and gives MP cells their own addressable anchor for future cross-references (e.g., articles linking to a specific MP form).

### D3. Skip-empty-MP-row check

For each tense, before rendering the MP row, the component computes whether *any* of the six cells has a value at `row[`${cell}.middle-passive`]`. If all six are undefined, the MP row is not rendered. This handles imperative cleanly and any future tenses where the engine doesn't produce MP.

### D4. Cell rendering reuses existing logic

The MP row uses the same `<DecomposedForm segments={result.decomposition} />` as the active row. The role-coded segment styling already supports the `voice-marker` role (introduced by MP aorist long ago and now used by MP admirative). The `u` particle and `qenkam`/`qenkësha` auxiliaries decompose correctly via the engine.

### D5. JS-disabled rendering is preserved

The component is server-rendered (no `'use client'`). The MP rows are part of the server-rendered HTML. Parsing the page without JavaScript surfaces both rows. The "100 distinct conjugated forms" assertion in the existing JS-disabled scenario continues to hold and is exceeded.

### D6. Spec coverage rule compliance

The change touches a UI rendering layer; the rules require:

- Test scenarios MUST include at least one suppletive verb. **flas** (a Class 2C three-stem verb) is exercised; **jam, jap, shoh** as suppletives in derived scenarios.
- Test scenarios MUST include at least one phonologically-mutating verb. **pjek** is in the corpus and produces MP cells we can verify.
- Both Active and Middle-Passive voices: covered by the row-pair design itself.
- Compound tenses (kam-aux and jam-aux paths): the MP row for compound tenses uses `qenkam`/`qenkësha` (jam-aux); active uses `kam`/`paskësha` (kam-aux). Scenarios verify both surfaces.

## Tradeoffs

- **Doubled vertical density.** Each mood-table grows by up to N rows. For a verb like `flas`, this adds ~12 rows (admirative MP all 4 tenses + indicative MP for present/imperfect/aorist/perfect/pluperfect + subjunctive MP + conditional MP + optative MP). Acceptable: scrolling is normal for a reference table; the alternative (toggle UI) hides information.
- **MP rows for tenses with rare MP usage.** Some MP forms are dispreferred or restricted to 3rd person evidential meaning (per Albanian grammars). We render them anyway because the engine produces them and they ARE attested in Kaikki for many verbs. Reference quality > prescriptive trim.
- **Voice indicator is textual, not iconographic.** A small `MP` badge is less visually distinctive than an icon, but accessible-by-default and language-agnostic. Tooltips can layer on later if needed.
- **No voice toggle.** Researchers might prefer to filter to a single voice. Deferred — empty toggle adds chrome; the row pair is dense but legible.

## Resolved Questions

_None._
