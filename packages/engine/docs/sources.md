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

As of the v0.1.0 baseline:

| Match rate | 1244 / 1406 cells across 20 verbs    | 88.5%  |
| Verified   | duhet, hap, jam, jap, mund, pi,       |        |
|            | punoj, shoh, them, vij                | 10/20  |
| Close      | iki (4 mismatches)                    | 1/20   |
| Needs work | bej, djeg, dua, flas, ha, laj, marr,  |        |
|            | pjek, rri                             | 9/20   |

The 162 remaining mismatches are structural sub-paradigm gaps the
engine's three-class paradigm system does not yet capture. They are
scoped in change `refine-conjugation-engine`:

- **Class 1B vowel-stem -j**: bej, laj — aorist plurals retain -ë
  (`bëmë`, `lamë`) where the engine drops it.
- **Class 2 present-stem alternation**: marr/merr, pjek/piq, djeg/digj,
  flas/flet — 2sg/3sg/2pl present and entire imperfect use a mutated
  stem the engine does not currently track.
- **Class 2D**: iki — 1sg present takes an extra -i (`iki` not `ik`).
- **Class 3 irregulars**: dua, ha, rri — additional stem alternation in
  present and aorist plurals.

Every fix lands as a corpus update + paradigm addition; the engine's
public API stays stable.

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
