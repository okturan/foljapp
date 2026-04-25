## Context

The verb reference page is foljapp's first user-facing surface. Every later capability — search, playground, articles, IGT export, practice mode, dialect support — either links to or extends what this page establishes. Decisions made here propagate.

The page consumes two upstream capabilities (`conjugation-engine`, `verb-corpus`) without modifying their specs. It produces no data of its own; it is a presentation layer. The technical work is therefore mostly about React Server Components, static generation, table layout, and the role-coded coloring system that becomes foljapp's visual signature.

This change closes the foundation phase by delivering the first end-to-end vertical slice. After this lands, every subsequent change is incremental on top of working software.

## Goals / Non-Goals

**Goals:**

- Statically pre-render every verb in the corpus to its own HTML file at build time.
- Render every supported mood + tense + cell of the engine's output, never silently dropping forms.
- Implement role-coded coloring directly from the engine's `decomposition` array, with no second parsing layer.
- Mark unsupported cells (e.g., imperative 1sg) explicitly in the layout so the absence is visible, not invisible.
- Reserve UI slots for the four next-phase capabilities (practice, playground, IGT export, frequency) so v1's visual design is consistent with v2's.
- Achieve full content visibility without client-side JavaScript.
- Achieve WCAG AA accessibility for the conjugation table.

**Non-Goals:**

- No interactivity. Buttons and inputs that imply switching/toggling are reserved for the playground.
- No client-side state. The page is fully static.
- No search input on the page. Discovery is `add-search-and-browse`.
- No dialect toggle. Tosk only.
- No IPA, no audio, no etymology, no example sentences. Each is a future capability.
- No animation, transitions, or motion. Add later if a designer wants them.
- No pagination of the table. Every form for the verb is on one page.

## Decisions

### D1. React Server Component, top-to-bottom

Considered: RSC + Client Component split with the table as Client; full RSC with no client code; static export only.

Chosen: **Full RSC**. The page imports `@foljapp/engine`'s `table(verbId)` and renders the resulting structure to HTML at build time. No `"use client"` directives in v1.

Rationale: every requirement we have today is satisfiable by static HTML. Client interactivity will come, but bolting it on later via a child Client Component is straightforward; over-engineering it now (e.g., shipping the whole table client-side because someday a button will be added) inflates bundle size and complicates SSR.

### D2. generateStaticParams reads the corpus index, not the directory

The route's `generateStaticParams` SHALL import `data/verbs/index.json` (which the corpus build pipeline emits) rather than glob the directory. This means the route depends on the build pipeline having run; missing `index.json` SHALL fail the Next build with a clear error.

Rationale: index.json is a deliberate contract; directory globbing produces drift between the engine's view of the corpus and the page's view.

### D3. Table layout — one `<table>` per mood, tenses as rows, persons as columns

```
   Indicative                                               
   ┌─────────────┬─────┬─────┬─────┬─────┬─────┬─────┐    
   │             │ 1sg │ 2sg │ 3sg │ 1pl │ 2pl │ 3pl │    
   ├─────────────┼─────┼─────┼─────┼─────┼─────┼─────┤    
   │ Present     │ pun │ pun │ pun │ pun │ pun │ pun │    
   │ Imperfect   │ ... │ ... │ ... │ ... │ ... │ ... │    
   │ Aorist      │ ... │ ... │ ... │ ... │ ... │ ... │    
   │ Perfect     │ ... │ ... │ ... │ ... │ ... │ ... │    
   │ Pluperfect  │ ... │ ... │ ... │ ... │ ... │ ... │    
   │ ...         │     │     │     │     │     │     │    
   └─────────────┴─────┴─────┴─────┴─────┴─────┴─────┘    
                                                          
   Subjunctive                                             
   ┌─────────────┬─────┬─────┬─────┬─────┬─────┬─────┐    
   │ ...                                              │    
                                                          
   ... (each mood gets its own table)                     
```

Considered: one giant table for all moods; per-mood tables; tenses as columns instead of rows.

Chosen: **per-mood tables, tenses as rows**. Reasoning: scanning through tenses for a given person/number is the user's most common action, so person/number stays fixed across columns. Per-mood tables keep cell counts tractable (≤9 rows × 6 cols) and let users skip moods they don't need. One giant table is overwhelming and harms screen-reader navigation.

### D4. Role-coded coloring derives from `decomposition`, not from regex

Each cell renders the form by mapping over its `decomposition` array and wrapping each segment in a `<span>` with a Tailwind class `text-morph-{role}`. The engine's role labels become Tailwind class suffixes via a typed lookup in the page component.

Rationale: the engine has already done the structural analysis; re-doing it in the rendering layer is duplication and a source of drift. The five Tailwind tokens are already reserved by `webapp-foundation`.

Color *values* for the morph tokens are decided in this change (since this is the first place they render). Constraints:
- WCAG AA contrast against light AND dark backgrounds (the layout supports both via shadcn's theme).
- Tonal differentiation that survives partial color blindness (deuteranopia simulation is the bar — we'll use Coblis or a similar tool).
- Particles and voice-markers should pop more than stems and endings (they're the structural cues).

A working palette (light theme):
- `morph.particle` — saturated indigo
- `morph.auxiliary` — desaturated teal
- `morph.stem` — neutral foreground (no hue change — stem is the "anchor")
- `morph.ending` — warm orange
- `morph.voice` — magenta

Final values land in `apps/web/app/globals.css` via CSS custom properties; they are subject to designer review before merge.

### D5. Citations footer is a single component with two slots

The footer is a self-contained `<CitationsFooter sources={entry.sources} engineVersion={...} corpusVersion={...} />` component. Sources render as a list with the source name + reference linkified where the source is a URL (Kaikki). Versions render as a single line beneath.

### D6. Reserved action buttons use shadcn `Button` with `disabled` + tooltip

The four reserved actions (Practice / Playground / IGT Export / Frequency) render as a row of disabled `Button` components with the shadcn `Tooltip` showing "Coming soon — see roadmap for [capability-name]". Click handlers are intentionally absent.

This solves a long-tail design risk: when those capabilities ship, their entry points are already designed in. We only swap the disabled flag and add the handler.

### D7. Layout is single-column, max-width container

The verb page is a long scroll. Two-column or sidebar layouts add navigation complexity for v1. A single column with a sticky in-page TOC for moods (added in a follow-up change) is the next iteration.

```
   ┌──────────────────────────────────────────────────────┐
   │  [breadcrumb: foljapp > verb > punoj]                │
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │     punoj                          to work           │
   │     1sg present indicative                           │
   │                                                      │
   │     Zgjedhimi 1   ·   auxiliary: kam                 │
   │                                                      │
   │     present-stem: puno                               │
   │     aorist-stem:  punua                              │
   │     participle:   punuar                             │
   │                                                      │
   ├──────────────────────────────────────────────────────┤
   │     [Practice]  [Playground]  [IGT Export]   [Freq]  │
   │     (all disabled — reserved for future capabilities)│
   ├──────────────────────────────────────────────────────┤
   │                                                      │
   │     INDICATIVE                                       │
   │     ┌──────────────────────────────────────┐         │
   │     │  table here                          │         │
   │     └──────────────────────────────────────┘         │
   │                                                      │
   │     SUBJUNCTIVE                                      │
   │     ┌──────────────────────────────────────┐         │
   │     │  table here                          │         │
   │     └──────────────────────────────────────┘         │
   │                                                      │
   │     ... (one section per mood)                       │
   │                                                      │
   ├──────────────────────────────────────────────────────┤
   │     SOURCES                                          │
   │       · Husić paradigm 1A                            │
   │       · Kaikki: kaikki.org/.../punoj                 │
   │       · uniparser: punoj_class1                      │
   │     engine: 0.1.0   ·   corpus: 0.1.0                │
   └──────────────────────────────────────────────────────┘
```

### D8. URL canonicalization

Lemma URL paths are case-sensitive and DO NOT canonicalize. Albanian doesn't have casing ambiguity in lemmas (they're stored lowercase) but we explicitly do not auto-redirect uppercase requests to lowercase — a 404 is correct.

Rationale: implicit redirects mask data quality issues. If someone links to `/verb/Punoj` it's because of a mistake; better to show 404 and let them notice.

## Risks / Trade-offs

- **[Risk]** Build time scales linearly with corpus size; at 10k verbs each generating one HTML file we may hit Next.js build-time limits. → **Mitigation:** v1 has 20 verbs; full corpus arrives in a separate change where ISR can be introduced if pre-rendering everything proves too slow. The dynamic route is ISR-compatible without code change.

- **[Risk]** Static HTML is bulky when every cell wraps multiple `<span>`s for role coloring. Pages may be 100KB+. → **Mitigation:** Acceptable for v1 traffic. Compression will halve the wire size. If profiling shows weight hurts mobile load, we can introduce a `data-decomposition` attribute and CSS gradients.

- **[Risk]** Color choices for the morph tokens may not pass WCAG AA. → **Mitigation:** Run the working palette through Coblis (color-blind simulation) and Stark (contrast) before tasks 4.x are marked complete. Adjust values if any segment fails AA against either light or dark theme.

- **[Risk]** The "Coming soon" buttons feel like cruft if those capabilities don't ship. → **Mitigation:** They're cheap. If a capability is dropped from the roadmap, removing its button is one line.

- **[Trade-off]** No client-side JS in v1 means no copy-to-clipboard on individual forms. → **Acceptance:** Selecting and copying the form text via the OS works. A copy button is a Phase 2 enhancement.

- **[Trade-off]** Per-mood tables with hard column counts (always 6) leaves columns half-empty for moods like Imperative (only 2 supported cells). → **Acceptance:** Visual consistency across moods outweighs the wasted columns. The unsupported cells render as muted dashes, which is an honest signal of the language's structure.

## Migration Plan

Not applicable — `add-project-foundation`'s placeholder home page is unchanged by this change. The verb route is a new addition.

## Open Questions

- **Q1.** Should we cap the corpus size at v1 build time (e.g., refuse to build if >50 verbs because we haven't audited build performance)? → **Tentative:** No cap. With 20 seed verbs we won't be near any limit.
- **Q2.** Should the footer's source links open in new tabs (`target="_blank"`)? → **Tentative:** Yes for external URLs (Kaikki); no for internal references (Husić paradigm numbers don't link out).
- **Q3.** Should the page render Tosk-only in v1 even when the corpus entry has a Geg variant noted? → **Tentative:** Yes — Tosk only. Geg variants are visible in the corpus entry's `dialect` field but ignored by the page until `add-dialect-support`.

These resolve before tasks 3.x.
