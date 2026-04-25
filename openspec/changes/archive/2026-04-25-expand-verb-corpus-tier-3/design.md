## Context

The corpus has reached 100 verbs covering ~80% of Albanian text. Tier-3 is the next breadth push: 100 more verbs to ~92% coverage. Unlike tier-1 and tier-2, the regular-paradigm space is mostly exhausted — the next 100 most-frequent verbs include heavy irregulars (multi-stem, suppletive aorist, MP-only lemmas, mutating Class 2). Hand-crafting volume increases significantly.

## Goals / Non-Goals

**Goals:**

- Corpus at exactly 200 verbs.
- Coverage by class: ~40% Class 1, ~35% Class 2, ~15% Class 3, ~10% MP-only.
- 100% verify-engine match-rate maintained for active cells (the 2 documented disagreements may carry forward; new disagreements should be ≤ 5 total).
- Frequency annotations + Husić citations for all new entries.
- Sub-batch granularity for incremental landing.

**Non-Goals:**

- No engine paradigm-rule changes; existing rules + cellOverrides handle all cases.
- No tier-4 (200 → 500) — out of scope.
- No automatic Husić-glossary lookup for new verbs (that's `add-husic-glossary-resolution`).
- No regional or dialectal variant capture.

## Decisions

### D1. Sub-batch composition (target: 100 verbs)

The four sub-batches are organized to land independently. If 3a's curation runs over a session, 3b/3c/3d can wait without churn.

**3a — Class 1 (40 verbs)**

| Pattern   | Count | Sample lemmas                                            | Expected handling                                |
|-----------|-------|----------------------------------------------------------|--------------------------------------------------|
| -oj       | 10    | nxiroj, përshtat (no, that's class 2), aprovoj, lëviz, paraqes | Auto-scaffold                                    |
| -aj       | 10    | mbaj (already in corpus? no), ndaj, paguaj, gjuaj, kërcej, sjell | Hand-craft (irregular aorists/participles)       |
| -ej       | 10    | gjej, kthej, pëlqej, thej, blej, lyej, mbroj, vlej       | Hand-craft (most irregular)                      |
| -uaj      | 5     | shkruaj, përshkruaj, gatuaj, ndihmuaj, mësuaj             | Hand-craft (root-changing aorists)               |
| -yj/-yej  | 5     | thyej, fshij, hyj, ndyj, ngjyej                           | Hand-craft (irregular)                            |

**3b — Class 2 (35 verbs)**

| Pattern         | Count | Sample lemmas                                                      | Handling                       |
|-----------------|-------|--------------------------------------------------------------------|--------------------------------|
| Consonant regular | 20  | shes, përmbush, gris, përshëndet, mat, pyes, mbledh                | Auto + small hand-curation     |
| Mutating         | 10  | dëgjoj (no, class 1), pjek (in seed), djeg (in seed), heq, vjedh, sjell | Hand-craft (mutation patterns) |
| Suppletive       | 5   | bie, pres, vdes, them (in seed), thirr                             | Hand-craft                     |

**3c — Class 3 (15 verbs)**

| Pattern   | Count | Sample lemmas               | Handling                       |
|-----------|-------|-----------------------------|--------------------------------|
| Vowel-stem regular | 5  | di (in tier-2? check), eci, vete  | Hand-craft (irregular aorist)  |
| Vowel-stem irregular | 10 | fle, lë, ngjej, klyhem, vë, hyj, ngrij | Hand-craft  |

**3d — Reflexive / MP-only (10 verbs)**

| Lemma           | Translation                | Notes                                          |
|-----------------|----------------------------|------------------------------------------------|
| përgjigjem      | to answer                  | MP-only; lemma is explicit MP form              |
| lutem           | to pray / ask              | MP-only                                        |
| kujtohem        | to remember                | MP-only; from active `kujtoj`                   |
| mësohem         | to be taught / to learn    | MP-only; from active `mësoj`                    |
| ngrihem         | to rise / get up           | MP-only; from active `ngre`                     |
| ulet (3sg)      | to sit (impersonal-leaning)| MP-only with restricted person coverage          |
| ndodhem         | to be located / to happen  | MP-only                                        |
| zhgjehem        | to wake up                 | MP-only                                        |
| qarkullohem     | (?)                        | (Verify Kaikki coverage)                       |
| dëfrehem        | to enjoy oneself           | MP-only                                        |

The exact composition resolves during ingestion; the script's no-Kaikki-entry path documents lemmas that don't have full Kaikki tables. Such lemmas may need to be swapped for alternatives.

### D2. MP-only lemma handling (sub-batch 3d)

Albanian has lemmas whose dictionary form is the MP-stem (e.g., `përgjigjem`, ending in `-em`). The engine's class-1/2/3 paradigms assume the lemma is the active form. For MP-only verbs we have two architectural options:

**Option A (chosen): Class-tagged with full cellOverrides.** The lemma stores the MP form; `class` is set to whichever class its morphology fits (most are class 1 with -hem/-em endings); `principalParts` reflects MP-stem; cellOverrides cover every cell across present/imperfect/aorist/perfect/etc. The engine emits the MP forms when called for active voice (since active is the lemma) — somewhat unintuitive but works.

**Option B (rejected): Special "mp-only" verb category.** Would require engine flag `flags.mpOnly: true`, conditional dispatch, and major engine work. Out of scope for tier-3.

Option A's tradeoff: querying `conjugate(lemma, voice='middle-passive')` for an MP-only verb returns a "u + lemma" form that's grammatically nonsense (you can't double-MP). Acceptable: the cells that get queried are the active-as-MP ones, which produce correct surface forms.

### D3. Hand-crafting workflow per irregular verb

```
1. Read the lemma's Kaikki entry: capture the surface forms for present, imperfect, aorist, participle.
2. Read the corresponding Husić entry if available in the paradigm-model section.
3. Determine principalParts (present, aorist, participle stems).
4. Identify which cells diverge from the engine's default rules.
5. Add cellOverrides for the divergent cells.
6. Run verify-engine.ts --only-verb <id>; iterate until clean.
7. Document any Kaikki↔Husić disagreement in `notes`.
```

Estimated time per irregular: ~10 minutes. ~50 irregulars × 10 min ≈ 8 hours of focused work.

### D4. Frequency tier criteria (extends tier-1/tier-2)

| Tier      | Criterion                                              |
|-----------|--------------------------------------------------------|
| `core`    | Top-50 in Kote & Biba (already in seed/tier-1)        |
| `common`  | Top-50–200 (most of tier-3 lands here)                |
| `uncommon`| 200–500 (some tier-3 lands here)                       |
| `rare`    | Beyond 500 (none expected in tier-3)                   |

### D5. Verify-engine baseline target

200 verbs × ~80 cells/verb (after Kaikki+Husić consultation) ≈ 16,000 cells.

Acceptable mismatch rate: ≤ 5 total (the 2 existing djeg/pjek + up to 3 new ones from tier-3 hand-crafting). Engine bugs: zero.

### D6. No new e2e per verb; smoke per sub-batch

Each sub-batch contributes ONE e2e assertion that the sub-batch's exemplar verb renders correctly. Adding 100 individual e2e tests would slow the suite without commensurate value.

### D7. Husić citations where available

For each new verb, the `sources` field SHALL include:
- `{ source: 'kaikki', reference: <kaikki-url> }` always.
- `{ source: 'husic', reference: '<paradigm-class-pattern>' }` if the verb is in our Husić cache (from the paradigm-model section ingestion).
- `{ source: 'manual', reference: '<rationale>' }` for hand-crafted overrides.

After `add-husic-glossary-resolution` lands, more verbs will have Husić citations available via cross-resolution.

## Tradeoffs

- **Curation cost is high.** ~50 irregulars × 10 min = 8 hours. Mitigation: sub-batching allows incremental landing; the ingestion script handles the regulars in seconds.
- **MP-only lemmas are a semantic edge case.** Option A's "lemma=MP, query as active" is unintuitive but works. Mitigation: document in the corpus entry's `notes` field.
- **Engine paradigm rules might need extension** if a new pattern surfaces (e.g., a class-3 vowel-stem with an unattested aorist shape). Acceptable: engine changes are separate concerns; tier-3 stays scoped to corpus.
- **Frequency rankings are corpus-dependent.** Kote & Biba 2019 is one source; other corpora rank slightly differently. Tier assignments may be revisited for individual verbs.
- **Search index regrows.** FlexSearch handles ~200 entries fine; bundle size grows by ~10–15KB. Acceptable.

## Resolved Questions

_None._

## Open Questions

- **Q1.** Some Class 1 -ej verbs have multiple aorist patterns (e.g., `gjej` has historic `gjeta`, modern `gjeti`). Pick one consistently — recommend modern form per Kaikki/standard.
- **Q2.** For MP-only verbs, should the `auxiliary` field be `kam` or `jam`? Default to `kam` since the perfect compounds use `kam` regardless. Verify against Kaikki for each.
- **Q3.** If a hand-crafted verb's cellOverrides would diverge between Kaikki and Husić, which wins? Per project policy: Husić is authority #1, but engine has been Kaikki-aligned. Document any divergence and flag for resolution; default to Kaikki for engine consistency, mark Husić-disagreement in `notes`.
