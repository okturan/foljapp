## Context

`scripts/verify-engine.ts` was originally written when the project's primary truth source was Kaikki, which doesn't tag middle-passive separately (active and MP forms share tag-sets, distinguished only by surface shape). The verifier compensates with `formMatchesVoice` — a surface-shape filter that accepts/rejects forms based on whether they look like MP (`u `-prefix for aorist, `qenkam` for admirative, `jam`/`isha` for compound indicative).

When Husić-direct paradigm-model entries were added (`add-husic-paradigm-models`, archived earlier), the parsed cache files included MP cells with explicit `middle-passive` tags. But `verify-engine.ts` never iterated over MP voice for most mood/tense combinations, so the explicit MP tags went unused for indicative {present, imperfect, aorist, perfect, pluperfect, future}, subjunctive (all tenses), and conditional (all tenses). Authoritative `u bë` / `digjem` / `merrem` / `të digjesha` cells in Husić sat dormant.

The `fix-mp-aorist-3sg` and `align-mp-cells-with-husic` changes had to write their own audit scripts (forward-membership: "is this Husić form producible by the engine anywhere?") to surface the bugs. That's a workaround. The canonical verifier should do the comparison itself.

## Goals / Non-Goals

**Goals:**

- Verify engine output against Kaikki + Husić-direct for **both** voices across **every** supported mood/tense.
- Match MP forms with mood-particle prefixes (`të`, `do të`, `do`) against Kaikki/Husić ground truth.
- Triage and document surfaced mismatches with intent: real bug, source disagreement, cache artifact.

**Non-Goals:**

- New verifier output format (per-voice or per-mood breakdown beyond the current single summary line).
- New source data (no scraping new Wiktionary pages, no extending the Husić PDF parser).
- Fix engine bugs surfaced by triage — those become separate, scoped changes if non-trivial. The triage step in this change merely documents and possibly inlines fixes that are one- or two-line corpus tweaks.

## Decisions

### D1. Extend `FINITE_TENSE_KEYS` to include MP across all supported mood/tense combinations

```ts
const FINITE_TENSE_KEYS: Array<{ mood: Mood; tense: Tense; voice?: 'middle-passive' }> = [
  // Active — every existing entry preserved unchanged
  { mood: 'indicative', tense: 'present' },
  { mood: 'indicative', tense: 'imperfect' },
  { mood: 'indicative', tense: 'aorist' },
  { mood: 'indicative', tense: 'perfect' },
  { mood: 'indicative', tense: 'pluperfect' },
  { mood: 'indicative', tense: 'future' },
  { mood: 'subjunctive', tense: 'present' },
  { mood: 'subjunctive', tense: 'imperfect' },
  { mood: 'subjunctive', tense: 'perfect' },
  { mood: 'subjunctive', tense: 'pluperfect' },
  { mood: 'conditional', tense: 'present' },
  { mood: 'conditional', tense: 'perfect' },
  { mood: 'admirative', tense: 'present' },
  { mood: 'admirative', tense: 'imperfect' },
  { mood: 'admirative', tense: 'perfect' },
  { mood: 'admirative', tense: 'pluperfect' },
  { mood: 'optative', tense: 'present' },
  // MP — full coverage across moods/tenses where engine produces MP cells
  { mood: 'indicative', tense: 'present', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'aorist', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'pluperfect', voice: 'middle-passive' },
  { mood: 'indicative', tense: 'future', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'present', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'subjunctive', tense: 'pluperfect', voice: 'middle-passive' },
  { mood: 'conditional', tense: 'present', voice: 'middle-passive' },
  { mood: 'conditional', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'optative', tense: 'present', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'present', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'imperfect', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'perfect', voice: 'middle-passive' },
  { mood: 'admirative', tense: 'pluperfect', voice: 'middle-passive' },
];
```

`probeCell` already takes `voice` from the spec; no changes needed there.

### D2. Strip mood particles in `formMatchesVoice` before MP-shape detection

Current MP-shape regexes match the raw form: `u ` / `qenkam` / `jam`-family. They don't recognize `të lexohem` or `do të lexohem` as MP because the leading particle defeats the `^` anchor.

Fix: before testing MP shape, peel off leading particles for subjunctive/conditional/future contexts.

```ts
function formMatchesVoice(form: string, voice: 'active' | 'middle-passive', spec: CellSpec): boolean {
  // Peel mood-particle prefixes so the MP-shape regex sees the inner stem.
  let inner = form;
  if (form.startsWith('do të ')) inner = form.slice(6);
  else if (form.startsWith('do ')) inner = form.slice(3);
  else if (form.startsWith('të ')) inner = form.slice(3);

  const isUPrefixed = inner.startsWith('u ');
  const isJamAdmir = /^qenk(am|...)/.test(inner);
  const isJamIndicCompound = /^(jam|je|...)\b/.test(inner);
  // … rest unchanged
}
```

We strip from `inner` (a local), not the returned form. The verifier's `findKaikkiForm` and `findHusicFormWithProvenance` return the raw form (with particles), as before — this is purely a detector update.

Particle stripping is non-greedy (e.g., `të lexoj` is correctly classified as active because peeling `të` leaves `lexoj` which has no MP shape). This works because Albanian's mood particles are exactly these three prefixes for the contexts that matter (subjunctive `të`, conditional/future `do të`, future `do`).

### D3. Triage protocol for surfaced mismatches

After the verifier change lands, run `verify-engine.ts --verbose` and categorize every new mismatch:

- **Engine error.** Engine produces a form that disagrees with both Kaikki AND Husić (where both exist). Spec a follow-up change.
- **Source disagreement.** Kaikki and Husić disagree; engine matches one. Document the disagreement in `packages/engine/docs/sources.md` and bias toward Husić-direct (printed grammar) over Kaikki (Wiktionary, occasional typos).
- **Cache artifact.** Mismatch comes from a known cache-parser issue (e.g., `iki.jsonl` jam-paradigm contamination). Suppress at the cache-skip level if low-effort; otherwise document in `sources.md` known-quirks section.
- **Voice-shape false positive/negative.** The form-shape filter rejects a real MP form or accepts an active form that has MP-like surface. Tighten the regex / particle-strip logic.

Triage outcomes are recorded inline in the tasks file as we iterate; each "kept" mismatch lives in a "documented Kaikki/Husić anomalies" list in `sources.md`.

### D4. Baseline change is expected and acceptable

Pre-change baseline: 17068 / 17075 across 204 verbs (corpus 0.1.4). Mismatches: 7 (all Kaikki anomalies).

Post-change projection:

- Denominator rises substantially (more cells probed × 204 verbs).
- Match count rises (Husić-direct cells previously bucketed as `missing` now register as matches via the surface-shape filter).
- Mismatch count likely rises (engine bugs currently hidden become visible — this is the entire point).

The "must keep at" line in `sources.md` updates to the new totals after triage. The change is judged successful if triage reduces the surfaced mismatches to a stable, documented set.

### D5. Type signature update

`FINITE_TENSE_KEYS` is currently typed `Array<{ mood: Mood; tense: Tense }>`, which silently allowed the existing MP entries (TypeScript spreads `voice: 'middle-passive'` into a `CellSpec` that does have a voice field). Make this explicit:

```ts
const FINITE_TENSE_KEYS: Array<{ mood: Mood; tense: Tense; voice?: 'middle-passive' }> = [...];
```

No behavioral change; just documents intent.

### D6. No reordering of existing entries

Add the new MP entries at the end of `FINITE_TENSE_KEYS` to keep diff minimal. Order doesn't matter for correctness (every spec is iterated independently); ordering by mood/tense/voice for readability is a follow-up nicety.

## Tradeoffs

- **Loud baseline shift.** Adding probe coverage will surface bugs and dialectal/orthographic disagreements that were silently filed as "missing." The triage step prevents this from turning into noise: we land the verifier change WITH a triaged set of known anomalies and a stable baseline number.
- **`formMatchesVoice` particle stripping.** A simpler alternative would be to add explicit regexes for `^të ` / `^do të ` prefixes in the MP-shape patterns. The peel-then-test approach is more maintainable: one set of MP-shape patterns, one rule for particle handling.
- **Re-running for every verb.** The verifier already iterates every verb; adding ~16 more cells per verb adds modest compute (204 verbs × 6 person-numbers × 16 = ~20k extra cell probes). Engine output is fast; Kaikki cache is on disk; Husić cache is on disk. Total runtime impact: negligible.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should the verifier emit a per-voice breakdown in the summary line (`matches: X (Y active + Z MP)`)? Useful for tracking but not blocking. Defer to a small follow-up.
- **Q2.** Should the surface-shape filter be relaxed for verbs in `iki.jsonl` (which has the jam-paradigm contamination)? Or should we just accept that those verbs report extra mismatches we ignore? Lean toward "accept" — a cache-parser fix is the right place to address it, not the verifier.
