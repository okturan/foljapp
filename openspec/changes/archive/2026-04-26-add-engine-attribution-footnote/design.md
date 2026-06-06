## Context

The `CitationsFooter` component (rendered at the bottom of every `/verb/<lemma>` page) currently shows:

```
Sources
  Kaikki — Wiktionary  · <url>
  Manual entry         · scaffolded by ingest-kaikki-batch
  [Husić, ...]         · <reference>            ← only when applicable

Notes: <verb.notes>                              ← only when set

engine: 0.1.0 · corpus: 0.1.2
```

The per-verb sources list is accurate to where each verb's lemma/principal-parts/translation came from. But the engine — which actually generates the conjugated forms — relies on globally-applied rule sources:

1. **uniparser-grammar-albanian** — paradigm structure, suppletive forms.
2. **Husić, Albanian Verb Dictionary and Manual (2002)** — paradigm-model authority, suppletive table.
3. **Kadriu (2015), "Computational Modeling of Morphology in Albanian"** — 25-formula computational model.
4. **Wikipedia, Albanian morphology** — accessible cross-reference.

These are documented in `openspec/config.yaml` ("Engine LOGIC authority order") and in `packages/engine/docs/sources.md`, but surfaced only in `/references`. A user reading `/verb/kooperoj` (a verb without per-verb Husić data) sees no indication of the rich engine machinery underneath.

This change adds a one-line attribution to the footer.

## Goals / Non-Goals

**Goals:**

- Make engine-wide attribution discoverable from any verb page.
- Preserve per-verb data provenance accuracy (no false claims like "Husić" on a non-Husić verb).
- Keep the footer compact and unobtrusive.

**Non-Goals:**

- Replace or restructure the per-verb sources list.
- List every cross-reference (UD, Kote/Biba, Newmark, Buchholz/Fiedler) — focus on the four paradigm-shaping sources documented in `openspec/config.yaml`.
- Add per-verb engine-version detail beyond the existing `engine: 0.1.0`.

## Decisions

### D1. Wording

```
Paradigm engine derived from uniparser-grammar-albanian, Husić (2002),
Kadriu (2015), and Wikipedia. See References for full bibliography.
```

Where "References" is a Next.js `<Link>` to `/references`.

Constraints:
- Concise: one sentence.
- Names match the project's canonical short forms (`uniparser-grammar-albanian` is the GitHub repo name; `Husić (2002)` matches academic style).
- Year tags disambiguate Kadriu's specific paper.
- No "and" before each item — comma-separated list.

**Rejected wording alternatives:**

- *"Powered by uniparser..."* — too marketing-y for a reference work.
- *"The conjugation engine uses..."* — verbose, repeats "engine".
- *"Engine sources: ..."* — looks like a label header rather than a sentence.

### D2. Placement

Inside `<footer>`, **after** the `<ul>` of per-verb sources and **after** the optional `Notes:` line, but **before** the `engine: x · corpus: y` version line.

Visual order on the page:

```
Sources
  Kaikki — Wiktionary · ...
  Manual entry        · ...
  Husić, ...          · ...    ← optional

Notes: ...                       ← optional

Paradigm engine derived from uniparser-grammar-albanian, Husić (2002), Kadriu (2015), and Wikipedia. See References for full bibliography.

engine: 0.1.0 · corpus: 0.1.2
```

Rationale: the per-verb sources list is the most important per-verb info. The Notes are verb-specific. The paradigm-engine line is a constant — placing it just before the version metadata reads as "this is global to the page system" rather than mixed with per-verb data.

### D3. Styling

Match the existing footer typography: `text-xs text-stone-500`. Add `italic` for visual distinction (and to signal "meta-information") without making it noisy. Match the existing margin pattern: `mt-4` (matches the Notes line's spacing).

The "References" link uses `underline underline-offset-2 hover:text-stone-700` — same pattern as URL references in the per-verb sources list.

### D4. Component implementation

Use Next.js `<Link>` (already widely used in the codebase per the `next/link` imports). The link target is `/references`.

```tsx
import Link from 'next/link';

<p className="mt-4 text-stone-500 italic">
  Paradigm engine derived from uniparser-grammar-albanian, Husić (2002),
  Kadriu (2015), and Wikipedia. See{' '}
  <Link
    href="/references"
    className="underline underline-offset-2 hover:text-stone-700"
  >
    References
  </Link>{' '}
  for full bibliography.
</p>
```

### D5. Always rendered

The line is unconditional — it appears on every verb page regardless of which per-verb sources exist. Reason: the engine-wide authorities apply to every verb's conjugation, by definition.

## Tradeoffs

- **Footer length grows by one line.** Acceptable; the addition is small and adds value.
- **Doesn't list every reference** (Newmark, Buchholz/Fiedler, UD, Kote/Biba). Those are listed in /references. Listing them all in the footer would be noisy. The link to /references is the bridge.
- **Year tags ("2002", "2015") add length but improve clarity** for academic readers — keeps it.
- **"See References for full bibliography"** could be just "See /references" — but the natural-language sentence reads better.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should the same line appear in the playground's footer (if it has one)? The playground doesn't have a CitationsFooter today; out of scope.
- **Q2.** Should /api/verbs include the engine-wide attribution in JSON? Could add an `engineAttribution` string. Useful for API consumers; defer to a follow-up if requested.
