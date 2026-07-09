## Why

`udhetoj` was flagged `noMiddlePassive` in the June review on absent
evidence. A full-corpus scan (2026-07-07, all 1,907 partitions) found the
non-active paradigm overwhelmingly attested: **4,967 × *udhëtohet*** ("one
travels": *udhëtohet me orë të tëra*), 296 × *udhëtohej*, 209 diacritic-
folded, 38 × *udhëtohen*, 8 × *udhëtoheshin* — and notably **62 ×
*udhëtohesh*** (generic second person, *udhëtohesh mirë*), which rules out
the third-person-only flag as too narrow. The earlier "0 retained
sentences" signal was sampling luck: flagged verbs generate no MP targets,
so incidental retention is the only way their forms could appear.

The consistent treatment is `shkoj`'s: intransitive motion verb, full
mechanical MP paradigm, unattested persons simply remaining unattested.

The same scan settles `rri` the other way: the stay-sense impersonal is
real (*s'rrihet pa komentuar*) but `rrihet` is hopelessly contaminated by
`rrah` "beat" (*rrihet një maturant … me lopata*) among 12,995 hits, so
unflagging `rri` would attach beat-sense sentences as its example
evidence. `rri` stays flagged with this rationale; `vij` (*vihet* = `vë`)
and `jam` likewise.

## What Changes

- **`data/verbs/udhetoj.json`** — `flags.noMiddlePassive` removed (no
  replacement flag: full mechanical MP, the `shkoj` treatment). Corpus
  0.1.7 → 0.1.8.
- **Docs** — the flagged-verb inventory note in `data/corpora/README.md`
  records the scan evidence for both decisions; verify-engine baseline
  migration recorded in `packages/engine/docs/sources.md`.
- **Corpus lab** — targets regenerate (~200 new udhetoj MP targets incl.
  compounds); rescan chain refreshes artifacts and static examples;
  production redeployed.

## Capabilities

Extends `verb-corpus`: voice-flag decisions SHALL be grounded in
full-corpus evidence, recorded per verb.

## Impact

- **Data** — one verb JSON, version bump. No engine or verifier changes
  (the flag-suppressed rule simply stops applying to udhetoj).
- **verify-engine** — udhetoj's MP cells migrate from flag-suppressed /
  both-null matches to conjugated cells compared against sources (Kaikki
  carries no MP rows for it → expected match→missing migration, to be
  recorded exactly).
- **Audience tier** — learners: *udhëtohet* is everyday Albanian and now
  renders with corpus examples.

## Non-Goals

- **No `rri`/`vij`/`jam`/`duhet` changes** — evidence contaminated or
  absent, rationale recorded.
- **No homograph-disambiguation machinery** for the corpus scanner — a
  research-grade problem, out of scope.

## Sequence

```
PREREQ → impersonal-middle-passive-flags (evidence methodology)
THIS   → restore-udhetoj-middle-passive
NEXT   → (none pending)
```
