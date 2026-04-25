# Engine sources and citations

This file documents the linguistic authorities consulted while
implementing the conjugation engine. Source-priority order is set by
`openspec/config.yaml`:

1. **Husić, Geoff.** *Albanian Verb Dictionary and Manual* (KU Libraries, 2002).
   Primary authority for paradigm definitions, suppletive forms, and
   auxiliary-verb selection. Paradigm numbers (e.g., `1A`, `2B`) refer
   to Husić's tables.
2. **Kadriu, Adem (2015).** "Computational Modeling of Morphology in
   Albanian Language: The Case of Verbs" (ICT4LL).
   25-formula computational model used as cross-check for the paradigm
   structure encoded in `paradigms/class-{1,2,3}.ts`.
3. **Wikipedia, [Albanian morphology](https://en.wikipedia.org/wiki/Albanian_morphology).**
   Accessible cross-reference. Used for spot-checking when Husić and
   Kadriu disagree.
4. **timarkh/uniparser-grammar-albanian.** Open-source rule-based
   morphological analyzer. Cross-checked for paradigm structure and
   suppletive forms.

## v0.1.0 — Kaikki verification baseline

Run `npx tsx scripts/verify-engine.ts` to compare engine output against
Kaikki/Wiktionary's tagged conjugation tables for every corpus verb.

| Match rate | 1406 / 1406 cells across 20 verbs    | 100%   |
| Verified   | bej, djeg, dua, duhet, flas, ha, hap, |        |
|            | iki, jam, jap, laj, marr, mund, pi,   |        |
|            | pjek, punoj, rri, shoh, them, vij     | 20/20  |

(`duhet` is impersonal/defective and Kaikki has no conjugation table
for it; treated as a no-op match.)

The 434 cells flagged as "missing" are forms our engine produces
(future-perfect, future-in-past, etc.) that Kaikki's tables don't
enumerate. Those remain best-effort against Husić; they are not
counted as mismatches because there is no ground-truth form to
compare against.

## How the 100% rate was achieved

The engine paradigms (`packages/engine/src/paradigms/class-{1,2,3}.ts`)
implement the regular forms. Per-verb deviations are encoded as
`cellOverrides` on the corpus entry — a mood/tense → cell-label map
that the engine consults before paradigm dispatch. Specifically:

- **Class 1 admirative trim** is now participle-aware: `-rrë` → trim 1
  (preserve `marr`), `-rë` → trim 2 (`larë` → `la`), `-ur` → trim 2,
  `-ar`/`-uar` → trim 1, `-ë` → trim 1. Implemented in the engine, not
  per-verb.
- **Class 2 admirative** drops the entire `-ur` suffix (was just `r`).
  Engine paradigm fix.
- **iki** uses cellOverrides for its Class 2D subtype: 1sg `iki`,
  2sg/3sg `ikën`, aorist 3sg `iku`.
- **ha, rri** use cellOverrides for their consonant-stem aorist
  endings and aorist-stem-based optatives.
- **dua** uses cellOverrides extensively for its multi-stem present,
  imperfect, aorist, subjunctive 2sg/3sg, optative, and imperatives.
- **bej, laj** use cellOverrides for Class 1B aorist plurals + the
  `-j` imperative.
- **marr, pjek, djeg, flas** use cellOverrides for their present-stem
  alternations (merr, piq, digj, flet/flis), the consonant-stem
  imperfect, and imperatives.
- **jam optative 2pl** corrected from `qofshi` to `qofshit` in
  `packages/engine/src/auxiliaries.ts`.
- **shoh suppletive admirative** corrected from `parkam`/etc. to
  `pakam`/etc. in `packages/engine/src/suppletion.ts`.

`scripts/verify-engine.ts` is the canonical regression check. Any
corpus or engine change must keep the match-rate at 1406/1406 or
explicitly justify the regression in its OpenSpec change.

## Suppletive paradigm references

| Verb  | Husić paradigm | Notes                                            |
| ----- | -------------- | ------------------------------------------------ |
| jam   | (Auxiliary)    | "to be" — fully suppletive across all moods      |
| jap   | (Suppletive)   | "to give" — present `jap`, aorist `dhashë`       |
| shoh  | (Suppletive)   | "to see" — participle `parë`                     |
| vij   | (Suppletive)   | "to come" — auxiliary `kam`, suppletive aorist   |
| them  | (Suppletive)   | "to say" — aorist `thashë`                       |

## Phonological mutation references

- **Palatalization k → q** before front vowels: `pjek` → `poqa` (aorist)
- **Palatalization g → gj** before front vowels (manifests as `dogja` for `djeg` due to consonant cluster handling)
- **Palatalization ll → j**: less common in verbal paradigms, included for completeness

## Class assignment heuristic

| Class | Lemma ending     | Example | Aorist 1sg pattern |
| ----- | ---------------- | ------- | ------------------ |
| 1     | -j (vowel + j)   | punoj   | -ova / -uva        |
| 2     | consonant        | hap     | -a (consonant)     |
| 3     | vowel            | pi      | -va (with vowel)   |
