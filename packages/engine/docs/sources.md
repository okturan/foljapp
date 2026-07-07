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

## Verification baseline (engine 0.1.0, corpus 0.1.5)

Run `npx tsx scripts/verify-engine.ts` to compare engine output against
Kaikki/Wiktionary's tagged conjugation tables for every corpus verb.
The verifier probes both active and middle-passive voice across every
supported mood/tense combination since `verify-engine-voice-coverage`
(2026-04-28).

| Historical match rate | 19100 / 19109 cells across the former 204-verb corpus | 99.95% |
|            | (15467 Kaikki + 539 Husić-direct +    |        |
|            | 2482 Husić-derived + 306 from         |        |
|            | engine-throws-with-no-source under    |        |
|            | `noMiddlePassive` flag for jam/iki/   |        |
|            | vij). 9 documented Kaikki anomalies   |        |
|            | (engine matches standard Albanian,   |        |
|            | Kaikki has the typo). See the next    |        |
|            | section.                              |        |

> **Engine 0.1.1 (2026-07-07, `fix-negation-particles`):** negation now
> follows standard Albanian — optative negates with `mos` (was `nuk`:
> \**nuk qofsha* → *mos qofsha*) and the subjunctive negator follows `të`
> (*mos të punoj* → *të mos punoj*), per Newmark, Hubbard & Prifti (1982)
> and Husić (2002). Kaikki tables cover affirmative cells only, so the
> observed totals below are identical before and after (verified:
> 19,639 / 230 / 12,579 both runs).

> **Current baseline (engine 0.1.1, 203-verb corpus, re-recorded
> 2026-07-07):** **19,639 matches / 230 mismatches / 12,579 missing.**
> The 230 mismatches decompose exactly, all verified verb-by-verb:
>
> - **9 cells** — the legacy documented Kaikki anomalies below (engine
>   correct, Kaikki typo/bug), unchanged.
> - **60 cells, `mbroj`** — Kaikki's table applies the regular
>   `-oj → -ova/-uar` pattern, but `mbroj` takes the `-jt-` aorist:
>   *mbrojta*, *mbrojtur* (FGJSH; the corpus entry deliberately sets
>   `irregularAorist: true`). Engine correct; every aorist-stem-derived
>   cell mismatches.
> - **99 cells, `perfundoj`** — Kaikki's table is machine-garbage
>   (*përfundojim*, *përfundojja*: a bogus stem parse). Engine's standard
>   *përfundon / përfundojmë / përfundonte* is correct.
> - **62 cells, `qendroj`** — not an engine error but a data conflict: the
>   June MP review set `noMiddlePassive: true`, so the engine refuses MP
>   cells, while the Husić cache documents 132 middle-voice rows
>   (*qëndrohem*, incl. the standard impersonal *qëndrohet*). Whether the
>   flag or the cache wins belongs to the middle-passive attestation
>   review.
>
> Regression rule until then: matches must stay ≥ 19,639 and any NEW
> mismatch (beyond this decomposition) needs the same verb-by-verb
> investigation before landing.

### Documented anomalies (engine correct, source disagrees)

The 9 surfaced mismatches are all cases where Kaikki disagrees with both
the engine and Husić-direct paradigm models. The engine's output matches
standard Albanian (Newmark/Hubbard/Prifti 1982 + Husić 2002):

1. **`hekuros` indicative aorist 3sg** — Kaikki: `hekuroshekuros` (clear typo, the lemma typed twice). Engine: `hekurosi` (correct).
2. **`bej` indicative aorist MP 3sg** — Kaikki: `u bëri` (Kaikki applies the 3sg active ending, same buggy pattern the engine had pre-`fix-mp-aorist-3sg`). Engine: `u bë` (correct, matches Husić-direct).
3. **`laj` indicative aorist MP 3sg** — Kaikki: `u lau` (same Kaikki bug as #2). Engine: `u la` (correct).
4-8. **`bitis`/`djeg`/`gudulis`/`laj`/`pjek` active optative 2pl** — Kaikki: `-shit` (extra `t`). Engine: `-shi` (correct, paradigm default per Newmark + Husić).
9. **`laj` MP optative 2pl** — Kaikki: `u lafshit` (mirrors #8). Engine: `u lafshi`.
| Verified   | v0.1 seed (20) + tier-1 (30 -oj) +    |        |
|            | tier-2 (50) + tier-3 (104: 100 Class 1 |       |
|            | -oj continuation + 4 Class 2 hand-fixed) | historical 204/204 |
| Husić cache | 99 former corpus verbs with Husić data |        |
|            | via paradigm-model + glossary cross-  |        |
|            | resolution                            |        |

Corpus 0.1.1 (2026-04-25) adds the optional `englishForms` field on
`VerbEntry` (additive, non-breaking) and per-verb overrides on six
verbs (`jam`, `lind`, `mund`, `duhet`, `çel`, `shqipëroj`) consumed by
the english-gloss capability. No paradigm changes; engine stays at 0.1.0.
The +1060 match-rate delta vs. the prior baseline reflects earlier
corpus growth that hadn't been recorded here, not the english-gloss work.

Corpus 0.1.2 (2026-04-26) adds `husic` source citations to 41 verbs
that had a `.cache/husic/<id>.jsonl` file but lacked the citation in
their `sources` field. The change is data-only: 41 verb JSONs each
gain one source entry of shape `{ source: 'husic', reference: 'Husić
2002 — parsed cache (.cache/husic/<id>.jsonl)' }`. After this fix the
breakdown is: 100 cache files exist; 55 corpus verbs explicitly cite
Husić (14 hand-curated paradigm-model entries from the seed era + 41
parsed-cache entries from this change); 99 corpus verbs have
verifiable Husić data (the 55 above plus 44 cross-resolved via
paradigm + glossary lookup without a direct cache file — those are
candidates for a follow-up citation pass). A CI test in
`apps/web/lib/corpus-husic-citations.test.ts` enforces the
cache-↔-citation invariant going forward.

The 1824 baseline includes both active and middle-passive admirative
across all 4 tenses. Verify-engine probes both voices; for MP cells,
forms are filtered by surface morphology (`u`-prefix for simple tenses,
`qenkam`/`qenkësha` for compound) since Kaikki has no explicit MP tag.

(`duhet` is impersonal/defective and Kaikki has no conjugation table
for it; treated as a no-op match.)

Cells flagged as "missing" are forms our engine produces (future-perfect,
future-in-past, etc.) that Kaikki's tables don't enumerate. Those remain
best-effort against Husić; they are not counted as mismatches because
there is no ground-truth form to compare against.

Kaikki sometimes encodes a Gheg/dialectal alternate inside parens, e.g.,
`marrkësh (marrkej)` for `marr` admirative imperfect 3sg or
`u folkësh (folkej)` for the MP variant. `verify-engine.ts` strips the
parenthetical before comparison; the standard form is what we produce.
Kaikki's `u —` marker for nonexistent middle-passive cells is also
treated as no ground truth (excluded from match/mismatch counts).

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
- **Admirative imperfect / pluperfect** are now implemented across all
  three classes. The imperfect uses the same admirative-trim policy as
  the present, with kësha-family endings (`-kësha/-këshe/-kësh/-këshim/
  -këshit/-këshin`); 3sg is bare `-kësh`, the prescriptive `-kështe` and
  Gheg `-kej` variants are out of scope per uniparser's `nonst` / Gheg
  paradigm tags. The pluperfect composes `paskësha + participle`
  (kam admirative imperfect, registered in `auxiliaries.ts`).
- **Middle-passive admirative coverage**: simple tenses (present,
  imperfect) inject the `u` voice-marker (mirrors MP aorist); compound
  tenses (perfect, pluperfect) compose `qenkam`/`qenkësha + participle`
  via the standard `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary`
  switch. Fixed a pre-existing bug where `buildSimpleCell` ignored voice,
  causing MP admirative present to silently return the active form.
- **Middle-passive imperative**: `buildImperative` is voice-aware. For
  active voice it dispatches to the existing paradigm. For MP voice it
  consults `entry.cellOverrides['imperative.present.middle-passive']` and
  throws `UnsupportedCellError` when no override exists — faithful to
  Kaikki, which only lists MP imperatives for verbs with strong reflexive
  semantics. Seed corpus: `laj` (lahu, lahuni) and `shoh` (shihu, shihuni)
  carry overrides; other verbs throw.
- **Conditional verify-engine tagging**: Kaikki tags conditional forms by
  the verb form used in the construction (`do të punoja` → `imperfect`,
  `do të kisha punuar` → `past + perfect`), not by construction label.
  `tagsFor` is now mood-aware for conditional, and the past-disambiguation
  filter is mood-agnostic (`!wanted.has('past') && ftags.has('past')`).
  Net coverage gain: ~228 cells.
- **MP voice arc completion**: `buildOptative.present`, `buildIndicative.future`,
  and `buildIndicative.future-in-past` were ignoring voice and silently
  returning active forms for MP requests. All three now dispatch to MP
  paradigm rules (or `prependUMarker` for optative). A standing audit test
  in `packages/engine/test/audit-mp-coverage.test.ts` catches this bug
  class for any future builder by asserting every MP cell across all moods
  is voice-marked (u-prefix, jam-paradigm aux, or dedicated MP endings).
- **Tier-1 corpus expansion**: Added 30 high-frequency Class 1 -oj verbs
  via `scripts/ingest-kaikki-batch.ts` (regular paradigm derivation).
  Three (`perfundoj`, `shpejtoj`, `siguroj`) lack Kaikki entries; they
  show as no-ground-truth cells but pass engine round-trip. Total corpus:
  50 verbs, 4866/4866 Kaikki match-rate. Tier-2 (50→100) deferred — the
  ingest script handles regular -oj only; class 2/3 verbs and irregulars
  need the manual-cellOverrides path.
- **Husić verification scaffolding**: `scripts/parse-husic.ts` skeleton
  + `verify-engine.ts` Husić-fallback dispatch + format documentation
  (`packages/engine/docs/husic-format.md`). The PDF source is freely
  available open-access at KU ScholarWorks (handle 1808/1661); not
  print-only as initially assumed. `scripts/parse-husic-pdf.py` parses
  the OpenOffice-generated PDF into per-verb JSONL with the same shape
  as the Kaikki cache. Husić consultation is automatic when
  `.cache/husic/<id>.jsonl` exists for a corpus verb.
- **Two documented Kaikki↔Husić disagreements**: `djeg` and `pjek`
  optative present 2pl. Kaikki: `djegshit` / `pjekshit` (with -t).
  Husić: `djegshi` / `pjekshi` (without -t). Engine follows Kaikki via
  cellOverrides. The active form is verifiable; the MP form (where
  Kaikki has no entry) defaults to Husić's `u djegshi` / `u pjekshi`,
  which the engine doesn't match because of the cellOverride. Treated
  as a documented data discrepancy; standard Albanian grammars (Newmark
  1982 §10) give `-shi` so Husić is likely correct, but resolution is
  out of scope for this change.
- **Tier-2 corpus expansion**: 50→100 verbs. Extended
  `scripts/ingest-kaikki-batch.ts` with Class 1 -uaj, Class 2 consonant-
  stem, and Class 3 vowel-stem derivation rules. Class 1 -aj/-ej throw
  by design (mostly irregular; manifest authors must flag and hand-craft).
  Tier-2 batch: 47 auto-scaffolded regulars + 3 hand-crafted irregulars
  (`ngrij`, `sherbej`, `terheq`) with cellOverrides for stem alternations
  and aorist patterns. 100% Kaikki match-rate maintained at 7980/7980.
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
corpus or engine change must keep matches at ≥ 19,639 on the current
203-verb corpus (historical: 19100/19109 on the former 204-verb corpus)
or explicitly justify the regression in its OpenSpec change; the 230
standing mismatches are decomposed and accounted for in the baseline
callout near the top of this document.

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
