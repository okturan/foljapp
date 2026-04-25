# Husić verification source — format expectations

This document describes the data format `scripts/parse-husic.ts` produces
and `scripts/verify-engine.ts` consumes for Husić verification.

## Why Husić

Geoff Husić's *Albanian Verb Dictionary and Manual* (KU Libraries, 2002)
is our priority-1 logic source per `openspec/config.yaml`. It tabulates
every cell of every paradigm class — including future-perfect,
future-in-past, past-anterior, and other tenses Wiktionary's tables omit.
Roughly 1500 cells across our 50-verb corpus that currently report as
`missing-kaikki` in `verify-engine.ts` should be verifiable against
Husić.

## Source acquisition (manual prerequisite)

As of this writing Husić is print-only. Acquiring a digital copy is a
human task. Options:

1. **Publisher purchase** — most direct; preserves layout for parsing.
2. **Library scan / ILL** — KU Libraries holds the original. ILL takes
   2–6 weeks; scan quality varies.
3. **Hand-tabulated extract** — slowest but format-controllable; useful
   if a partial section is needed urgently.

The chosen source path is set as the `--source` argument to
`parse-husic.ts`. Do NOT commit copyrighted source content to the repo —
the cache (`.cache/husic/`) is git-ignored.

## Cache layout

```
.cache/
├── kaikki/
│   ├── punoj.jsonl
│   └── …
└── husic/
    ├── punoj.jsonl
    └── …
```

Each `.cache/husic/<id>.jsonl` is one JSON record per line:

```jsonl
{"form": "kam pasur punuar", "tags": ["indicative", "future-perfect", "first-person", "singular"]}
{"form": "do të kem pasur punuar", "tags": ["indicative", "future-perfect-in-past", "first-person", "singular"]}
```

This is the same shape as the Kaikki cache, so `findHusicForm` can
reuse the tag-set filter logic (`tagsFor` from `verify-engine.ts`).

## Tag vocabulary

Husić labels paradigms in Albanian. parse-husic.ts maps to the engine's
English-language tag namespace:

| Albanian / Husić label              | Engine tag                                |
|-------------------------------------|-------------------------------------------|
| dëftore                             | `indicative`                              |
| lidhore                             | `subjunctive`                             |
| kushtore                            | `conditional`                             |
| habitore                            | `admirative`                              |
| dëshirore                           | `optative`                                |
| urdhërore                           | `imperative`                              |
| e tashme                            | `present`                                 |
| e pakryer                           | `imperfect`                               |
| e kryer e thjeshtë                  | `aorist`                                  |
| e kryer                             | `perfect`                                 |
| më se e kryer                       | `pluperfect` (emit `past + perfect`)      |
| e kryer e tejshkuar                 | `past-anterior`                           |
| e ardhme                            | `future`                                  |
| e ardhme e përparme                 | `future-perfect` (emit `future + perfect`)|
| e ardhme e së shkuarës              | `future-in-past`                          |
| e ardhme e së shkuarës e përparme   | `future-perfect-in-past`                  |
| veprore                             | `active` (omit; absence implies active)   |
| joveprore / pësore                  | `middle-passive`                          |
| veta I / II / III                   | `first-person/second-person/third-person` |
| njëjës / shumës                     | `singular / plural`                       |

For tense overloading (e.g., conditional present using imperfect verb
form), follow Kaikki's convention so verify-engine's existing tag logic
applies: emit `imperfect` for conditional present, `past + perfect` for
conditional perfect / pluperfect.

## Voice convention

- Active forms: emit no voice tag (parallel to Kaikki).
- MP forms: emit `'middle-passive'` tag explicitly. The `formMatchesVoice`
  heuristic in verify-engine handles the surface filter as a backup.

## Dialect filter

Husić's print source occasionally lists Tosk vs. Gheg variants.
parse-husic.ts SHALL emit Standard Albanian (Tosk-based) only. Gheg or
archaic forms SHALL be filtered at parse time, not at verify time.

## Mismatch escalation

When `verify-engine.ts` reports a mismatch where the engine output
disagrees with a Husić-tabulated form, the resolution is per-cell:

1. **Engine paradigm bug**: fix the paradigm rule.
2. **Per-verb irregularity**: add a `cellOverride` to the corpus entry.
3. **Husić-side ambiguity**: rare; document in `parse-husic.ts` filter logic.

Husić-vs-engine disagreements are real bugs (Husić is authority #1),
not parser quirks to ignore.

## "Potential override candidate" warning

When Husić provides a form for a cell where the engine currently throws
`UnsupportedCellError`, `verify-engine.ts` SHALL log a warning of the
form:

```
[?] punoj imperative.present.middle-passive.2sg — engine throws; Husić has "punohu". Consider adding cellOverrides['imperative.present.middle-passive'].
```

This surfaces candidate cellOverrides for human review without auto-failing.
