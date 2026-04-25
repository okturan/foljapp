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

## v0.1.0 — linguistic-completeness disclaimer

The forms emitted by the v0.1.0 engine are best-effort against the
spec scenarios authored in `openspec/specs/conjugation-engine/spec.md`,
which are themselves drawn from Husić tables. Cells outside those
scenarios — particularly admirative imperfect/pluperfect, optative
perfect, and middle-passive future-perfect — are produced by the
paradigm engine without explicit per-cell verification against a
native speaker or a published authority.

Before this engine ships to production, an Albanian linguist should
audit the full paradigm tables against Husić §§1A-3D and the
suppletion table for jam, jap, shoh, vij, them.

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
