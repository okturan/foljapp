## Context

Kaikki / Wiktionary tags Albanian verb forms by the *form* used, not by the *construction's grammatical label*. This shows up clearly in conditional, where the construction `do të X` re-uses verb forms from other paradigms:

```
construction              Kaikki tags                     surface
─────────────────────────────────────────────────────────────────
conditional present       imperfect + conditional         do të punoja
conditional perfect       past + perfect + conditional    do të kisha punuar
```

Compare to indicative, where the same `imperfect` tag means a different construction:

```
indicative imperfect      imperfect + indicative          punoja
indicative pluperfect     past + perfect + indicative     kisha punuar
indicative perfect        perfect + indicative            kam punuar
```

The `imperfect` tag overloads across moods. The `past + perfect` tag overloads similarly. Our `tagsFor` was written assuming Kaikki tags by construction-label, which it doesn't.

## Goals / Non-Goals

**Goals:**

- verify-engine produces accurate `match` outcomes for every conditional cell in the corpus.
- The past-disambiguation filter remains correct for all moods, present and future.
- Zero new mismatches introduced. Net: +12 cells × ~19 verbs ≈ +228 matches.

**Non-Goals:**

- No engine output changes.
- No new cells in the cell list.
- No alternative verification source (that's `add-husic-verification-source`).
- No reformat of the verify-engine output / CLI surface.

## Decisions

### D1. tagsFor for conditional uses construction-internal verb-form tags

```ts
// Before:
if (spec.tense === 'present' && spec.mood !== 'imperative') tags.add('present');

// After: mood-aware for conditional, all other moods unchanged.
if (spec.mood === 'conditional') {
  if (spec.tense === 'present') tags.add('imperfect');
  if (spec.tense === 'perfect') {
    tags.add('past');
    tags.add('perfect');
  }
} else {
  // existing branches: present, imperfect, aorist, perfect, pluperfect, future
}
```

This faithful tag emission is the entire fix on the tag-emission side.

### D2. Past-disambiguation filter becomes mood-agnostic

The existing filter:

```ts
if (spec.tense === 'perfect' && ftags.has('past')) continue;
```

was correct for indicative/subjunctive perfect (skip past-tagged = skip pluperfect) and incorrect for conditional perfect (which IS past-tagged). The replacement:

```ts
if (!wanted.has('past') && ftags.has('past')) continue;
```

is mood-agnostic. Behavior table:

| Spec                              | wanted has 'past' | ftag 'past' present | Result               |
|-----------------------------------|-------------------|---------------------|----------------------|
| indicative perfect                | no                | (form `kam punuar`)  no | match                |
| indicative perfect                | no                | (form `kisha punuar`) yes | skip (correct)       |
| indicative pluperfect             | yes               | yes                 | match (correct)      |
| subjunctive perfect               | no                | no                  | match                |
| subjunctive pluperfect            | yes               | yes                 | match                |
| admirative perfect                | no                | no                  | match                |
| admirative pluperfect             | yes               | yes                 | match                |
| conditional present (after D1)    | no                | no                  | match                |
| conditional perfect  (after D1)   | yes               | yes                 | match                |

All cases handled correctly.

### D3. Why this fix doesn't conflict with admirative tag mapping

Admirative pluperfect tags also include `past + perfect`. After this change:
- Spec `(admirative, pluperfect)` → wanted = `['admirative', 'past', 'perfect', ...]`. Already adds 'past' (per the existing pluperfect mapping).
- Kaikki form `paskësha folur` has tags `['admirative', 'past', 'perfect', ...]`.
- wanted ⊆ ftags. Filter: wanted.has('past') = true → don't skip. Match.

Admirative perfect:
- Spec `(admirative, perfect)` → wanted = `['admirative', 'perfect', ...]`.
- Kaikki form `paskam folur` tags `['admirative', 'perfect', ...]`. No 'past'. Match.
- Kaikki form `paskësha folur` tags include 'past'. Filter: wanted.has('past') = false, ftags.has('past') = true → skip. Correct.

### D4. Why we don't need a separate scenario for non-conditional moods

The replacement filter is provably equivalent to the original for all moods that don't tag with 'past'. Only conditional present/perfect changes behavior. The new scenarios cover the changed cases plus a regression check for indicative perfect/pluperfect. Subjunctive and admirative perfect/pluperfect retain their existing test coverage from prior changes.

### D5. No CellSpec field changes

`CellSpec` already has `voice` (added by `add-mp-admirative-coverage`). No new fields needed. The mood-aware logic lives in `tagsFor` and `findKaikkiForm` only.

## Tradeoffs

- **Mood-aware tag emission introduces a small switch in `tagsFor`.** Acceptable: the switch is bounded to conditional, well-commented, and follows Kaikki's actual convention. Future moods (none anticipated) would need the same treatment if they re-use other moods' verb forms.
- **The new filter `!wanted.has('past') && ftags.has('past')` is more general than the old one.** This means it will affect cells we haven't enumerated explicitly. Mitigated by the regression scenarios for indicative perfect/pluperfect that lock in the old behavior.
- **Match-rate baseline jumps non-trivially (~228 cells).** Visible improvement; updates `packages/engine/docs/sources.md` accordingly.

## Resolved Questions

_None._

## Open Questions

_None._
