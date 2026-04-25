## Context

Husić's *Albanian Verb Dictionary and Manual* (Geoff Husić, KU Libraries, 2002) is a print reference grammar of Albanian conjugation. It tabulates paradigms by class (1A, 1B, 2A, 2B, 2C, 3A, etc.) and lists irregular verbs with their full paradigms. It is the canonical source for tense/aspect/mood combinations that newer descriptive grammars and Wiktionary tables truncate (Wiktionary's tables stop at the most-common compound tenses; Husić enumerates all of them, including future-perfect, future-in-past, past-anterior, etc.).

Currently `scripts/verify-engine.ts` reports 740 cells per the post-`refine-verify-engine-tagging` baseline as `missing-kaikki` because Wiktionary's tables don't list those forms. Most of those cells our engine produces correctly (per the paradigm rules + auxiliary tables) but are unverifiable. Husić closes that gap.

## Source-acquisition status

As of this proposal, Husić is print-only. Implementation depends on a digital source — either a publisher PDF, an OCR of a physical copy, or a hand-tabulated extract. Acquisition is task 1.1 below.

Once a source is in hand, parsing depends on the source format. The design here is **format-agnostic at the verify-engine integration boundary**: parse-husic.ts produces JSONL with the Kaikki shape; verify-engine consumes JSONL with the Kaikki shape. The format-specific code lives entirely inside parse-husic.ts and can be rewritten if the source format changes.

## Goals / Non-Goals

**Goals:**

- Verify cells our engine produces against Husić for every cell Husić tabulates.
- Hold a 100% match-rate against Husić (per-verb mismatches are real bugs to fix).
- Auditable per-cell source provenance (Kaikki vs Husić) in verify-engine output.
- Husić cache files in the same shape as Kaikki cache, with the same tag vocabulary.

**Non-Goals:**

- No on-the-fly OCR. The Husić digital source must already be parseable.
- No support for non-Latin or non-UTF-8 inputs.
- No retroactive bumping of the 1860/1860 baseline; introduce a separate combined baseline.
- No replacement of Kaikki. Kaikki stays primary because it's tagged at the form level and machine-curated.
- No exposure of Husić in the user-facing UI beyond what `verbEntry.sources[].reference` already shows.
- No support for Husić's class numbers as a separate API field. The `class` field on `VerbEntry` already covers this.

## Decisions

### D1. Cache layout matches Kaikki

```
.cache/
├── kaikki/
│   ├── punoj.jsonl
│   ├── flas.jsonl
│   └── ...
└── husic/
    ├── punoj.jsonl
    ├── flas.jsonl
    └── ...
```

Each file is one JSON record per line:

```jsonl
{"form": "kam pasur punuar", "tags": ["indicative", "future-perfect", "first-person", "singular"]}
{"form": "do të kem pasur punuar", "tags": ["indicative", "future-perfect-in-past", "first-person", "singular"]}
```

### D2. Tag vocabulary

Husić uses Albanian-language paradigm labels in the print source. parse-husic.ts maps to the engine's English-language tag namespace:

| Albanian / Husić label   | Engine tag                          |
|--------------------------|-------------------------------------|
| dëftore                  | `indicative`                        |
| lidhore                  | `subjunctive`                       |
| kushtore                 | `conditional`                       |
| habitore                 | `admirative`                        |
| dëshirore                | `optative`                          |
| urdhërore                | `imperative`                        |
| e tashme                 | `present`                           |
| e pakryer                | `imperfect`                         |
| e kryer e thjeshtë       | `aorist`                            |
| e kryer                  | `perfect`                           |
| më se e kryer            | `pluperfect`                        |
| e kryer e tejshkuar      | `past-anterior`                     |
| e ardhme                 | `future`                            |
| e ardhme e përparme      | `future-perfect`                    |
| e ardhme e së shkuarës   | `future-in-past`                    |
| e ardhme e së shkuarës e përparme | `future-perfect-in-past`   |
| veprore                  | `active`                            |
| joveprore / pësore       | `middle-passive`                    |
| veta I/II/III            | `first-person/second-person/third-person` |
| njëjës / shumës          | `singular / plural`                 |

Persons and numbers may already be encoded in the table layout; parse-husic.ts derives them from row/column position rather than from explicit tags.

### D3. verify-engine dispatch order

```
for cell in cellSpec list:
  kaikki_form = findKaikkiForm(cell)
  if kaikki_form is not None:
    compare(engine_form, kaikki_form, source='k')
    continue
  husic_form = findHusicForm(cell)
  if husic_form is not None:
    compare(engine_form, husic_form, source='h')
    continue
  status = 'missing-both'
```

Match-rate counts both Kaikki and Husić matches. Mismatches against Husić are real (since Husić is authority #1 in our config).

### D4. Source-provenance annotations

Per-cell line in verbose mode:

```
indicative/future-perfect/1sg          M (h)  engine="kam pasur punuar"  husic="kam pasur punuar"
admirative/imperfect/1sg               M (k)  engine="folkësha"           kaikki="folkësha"
indicative/past-anterior/1sg           -      kaikki=null  husic=null  (genuinely missing)
```

Summary block:

```
matches:    1860 (k) + 712 (h) = 2572
mismatches: 0
missing:    28   (no source has ground truth)
errors:     0
```

### D5. Husić cache absence is non-fatal

Acquiring Husić data may proceed verb-by-verb. If `.cache/husic/punoj.jsonl` exists but `.cache/husic/marr.jsonl` doesn't, verify-engine SHALL still run; cells for `marr` that Kaikki doesn't have stay `missing-kaikki`. This permits incremental Husić ingestion (one verb at a time) without blocking the entire script.

### D6. Tag-mapping correctness

parse-husic.ts MUST produce tags that align with Kaikki's convention so that `findKaikkiForm` and `findHusicForm` can share filter logic (or `findHusicForm` can wrap a renamed copy). Edge cases:

- **Pluperfect**: emit `past + perfect` (Kaikki convention).
- **Conditional present**: emit `imperfect + conditional` (Kaikki convention).
- **Conditional perfect**: emit `past + perfect + conditional`.
- **Future-perfect**: emit `future + perfect` (extrapolation; Kaikki doesn't include this tense).
- **Past-anterior**: emit a single `past-anterior` tag (no Kaikki equivalent; we own the convention).
- **Voice**: emit `middle-passive` for MP cells; absence implies active.

The convention is documented authoritatively in `packages/engine/docs/husic-format.md` (created by this change).

### D7. Match comparison preserves the active/MP voice filter

The existing `formMatchesVoice(form, voice, spec)` heuristic (added by `add-mp-admirative-coverage`) operates on surface form. It stays applicable to Husić data: if Husić emits an `'middle-passive'` tag, we accept directly; if Husić uses surface morphology (u-prefix etc.) without the tag, the heuristic catches it. Both paths converge.

## Tradeoffs

- **Husić's tags are derived from print-table layout, not source-tagged like Wiktionary's templates.** parse-husic.ts must enforce its own correctness — a single misaligned table row can mistag a column of cells. Mitigation: cross-validate against Kaikki on cells where both have data; mismatches there indicate parse-husic bugs.
- **Format-agnostic boundary at JSONL means a re-parse is needed if Husić's source changes.** Acceptable; the parse step is the only file-format-coupled component, and JSONL is robust.
- **No automatic source acquisition.** The change ships scaffolding that's inert until a digital source lands. We accept this dependency to avoid encoding source-acquisition policy into the change.
- **Match-rate denominator changes.** Reports break in two: per-source counts and combined baseline. Acceptable — it's strictly more information.
- **Husić's Class IB/IIA paradigm tables sometimes list older Tosk forms.** parse-husic.ts must filter out variants flagged as archaic. Mitigation: per-Husić-section parsing rules in parse-husic.ts; documented exceptions in `husic-format.md`.

## Resolved Questions

_None._

## Open Questions

- **Q1.** What's the canonical source format for Husić ingestion — publisher PDF (paid), library scan (ILL), or hand-tabulated TSV? Defer until task 1.1 outcomes.
- **Q2.** If Husić records additional dialect variants (rare), do we filter them out at parse-time or at verify-engine? Recommend parse-time so the cache is single-source-of-truth Standard Albanian; document in husic-format.md.
- **Q3.** If Husić provides forms for a cell that the engine currently throws `UnsupportedCellError` for (e.g., MP imperative for a verb without our cellOverride), do we treat it as a mismatch or as a hint to add cellOverrides? Recommend: log as a "potential override candidate" warning; surface in a CI report; do not auto-fail.
