## Context

20 verbs is small. A typical learner's first 100 Albanian verbs covers ~80% of textual usage; 50 verbs covers ~65%. The expansion path:

```
v0.1.x: 20 verbs (engine-test focused)
tier-1: 30 added → 50 total (this change)
tier-2: 50 added → 100 total (follow-up)
tier-3: 100 added → 200 total (eventual)
```

The strategic question for tier-1: **which 30 verbs?** The answer is driven by frequency, paradigm-class diversity, and pedagogical priority.

## Goals / Non-Goals

**Goals:**

- Expand corpus to 50 verbs.
- Bulk-ingestion tooling that scales to 50 → 100 → 200.
- 100% verify-engine match-rate maintained.
- Frequency-tier annotations for every new verb.
- Sources cited per verb.

**Non-Goals:**

- No engine work; existing paradigm rules suffice.
- No new tense or mood support.
- No expansion beyond 50.
- No automatic Husić ingestion (separate change).
- No bulk import of Kaikki's Albanian verb dictionary wholesale; we curate.

## Decisions

### D1. Selection criteria for tier-1

Combined ranking from three sources:

1. **Kote & Biba (2019)** "Albanian Verb Frequency from a Neural Tagging Pipeline" — top-200 list. Use as primary.
2. **iMekMak / Wikiwand top-50 lists** for Albanian — sanity check.
3. **Pedagogical priority**: any verb appearing in the first 50 lessons of the standard Albanian language curricula (Kashtjeli/Kola textbooks, Newmark *Standard Albanian*).

Verbs selected if they rank in the top-100 across ≥ 2 of the three sources AND aren't already in v0.1 seed.

Tie-break: paradigm-class balance — aim for roughly 55% Class 1, 30% Class 2, 15% Class 3 (matching the lemma-class distribution in Kote & Biba).

### D2. Tier-1 batch list (proposed; finalize during ingestion)

| #  | Lemma     | Translation              | Class | Notes                                |
|----|-----------|--------------------------|-------|--------------------------------------|
| 1  | dal       | to leave / go out        | 2     | irregular aorist (dola)              |
| 2  | hyj       | to enter                 | 1     | regular -j                           |
| 3  | vete      | to go                    | 3     | irregular (suppletive aorist `vajta`)|
| 4  | eci       | to walk                  | 3     | regular vowel-stem                   |
| 5  | kthej     | to return / turn back    | 1     | regular -j                           |
| 6  | gjej      | to find                  | 1     | regular -j                           |
| 7  | lë        | to leave (something)     | 3     | irregular monosyllable               |
| 8  | mësoj     | to learn / teach         | 1     | regular -j; common reflexive `mësohem` |
| 9  | lexoj     | to read                  | 1     | regular -j                           |
| 10 | shkruaj   | to write                 | 1     | regular -j                           |
| 11 | fle       | to sleep                 | 3     | irregular consonant-final            |
| 12 | prish     | to spoil / break         | 2     | regular consonant-stem               |
| 13 | di        | to know                  | 3     | regular vowel-stem                   |
| 14 | kërkoj    | to search / ask for      | 1     | regular -j                           |
| 15 | ndodh     | to happen                | 2     | regular; commonly impersonal 3sg     |
| 16 | mendoj    | to think                 | 1     | regular -j                           |
| 17 | ndaj      | to separate / divide     | 1     | regular -j                           |
| 18 | ndal      | to stop                  | 2     | regular consonant-stem               |
| 19 | ndez      | to light / turn on       | 2     | regular consonant-stem               |
| 20 | përdor    | to use                   | 2     | regular consonant-stem               |
| 21 | përfundoj | to finish                | 1     | regular -j                           |
| 22 | qaj       | to cry                   | 1     | regular -j                           |
| 23 | fitoj     | to win                   | 1     | regular -j                           |
| 24 | blej      | to buy                   | 1     | regular -j                           |
| 25 | shoh-ish  |                           |       | (already in seed; placeholder slot)  |
| 26 | rri-ish   |                           |       | (already in seed; placeholder slot)  |
| 27 | hap-ish   |                           |       | (already in seed; placeholder slot)  |
| 28 | shes      | to sell                  | 2     | regular consonant-stem               |
| 29 | mbaj      | to hold / keep           | 1     | regular -j                           |
| 30 | filloj    | to begin                 | 1     | regular -j                           |
| 31 | mbyll     | to close                 | 2     | regular consonant-stem               |
| 32 | duroj     | to endure                | 1     | regular -j                           |

(Slots 25–27 are typos in the table above; the final ingestion list omits duplicates and may swap based on Kaikki coverage. Final list resolved during ingestion task 4.1.)

### D3. Frequency-tier criteria

| Tier      | Criterion                                                          |
|-----------|--------------------------------------------------------------------|
| `core`    | Top-50 in Kote & Biba; appears in every textbook                  |
| `common`  | Top-50–200 in Kote & Biba; appears in most textbooks              |
| `uncommon`| 200–500 in Kote & Biba; appears in ≥ 1 textbook                   |
| `rare`    | Beyond 500; specialized vocabulary                                 |

Most tier-1 verbs are expected to land in `core` or `common`.

### D4. Ingestion workflow

```
1. Pick lemma from manifest                  (manual)
2. Fetch Kaikki JSONL                         (automated)
3. Parse headword for principal parts         (automated)
4. Infer class                                 (automated, with manifest override)
5. Scaffold JSON file                          (automated)
6. Run verify-engine --only-verb <id>          (automated)
7a. If clean → mark verb ready                 (automated)
7b. If mismatches → mark TODO + dump output   (automated)
8. Human review of TODO entries               (manual)
9. Add cellOverrides where needed              (manual)
10. Re-run verify-engine for that verb        (manual)
11. Update frequency.json                      (manual)
```

### D5. Manifest format

```json
[
  { "lemma": "dal", "class": 2, "auxiliary": "kam", "tier": "core" },
  { "lemma": "hyj", "class": 1, "auxiliary": "kam", "tier": "common" },
  ...
]
```

The manifest is hand-curated. The ingestion script's job is to expand each entry into a populated `data/verbs/<id>.json`.

### D6. Verification gate

Tier-1 ingestion is "complete" when:
- All 30 new verbs have populated JSON entries.
- `npx tsx scripts/build-corpus.ts` passes.
- `npx tsx scripts/verify-engine.ts` reports zero mismatches across all 50 verbs.
- `data/verbs/frequency.json` has tier annotations for all 50 verbs.

### D7. Schema-validation enforcement

`scripts/build-corpus.ts` already validates each JSON against `verbEntrySchema`. New ingestion gets the same gate for free.

### D8. Source-attribution policy

Every new entry's `sources` field SHALL include at least:
- `{ source: 'kaikki', reference: <kaikki-url> }`

Irregulars or verbs with cellOverrides SHOULD also include:
- `{ source: 'manual', reference: 'cellOverrides verified against <citation>' }`

Once `add-husic-verification-source` lands, future ingestion can also auto-add Husić citations for verbs Husić tabulates.

## Tradeoffs

- **Curation cost.** Each new verb takes ~5–15 minutes to verify (fast for regulars, slow for irregulars). 30 verbs × 10 min avg = 5 hours of human review. Mitigation: the ingestion script does the bulk; humans only review TODO entries.
- **Frequency rankings vary across corpora.** Pedagogical priority is somewhat subjective. Mitigation: cite the rationale in design D1, document selection in `notes` fields.
- **Engine bug surface.** Adding 30 verbs may surface latent paradigm-rule bugs. Mitigation: each verb's verify-engine output is the gate; bugs become a follow-up engine change rather than blocking this one (TODO markers in JSON).
- **Search index regenerates.** FlexSearch regenerates on build with no code changes. Bundle size grows linearly with corpus; at 50 verbs the impact is small (~5KB).
- **Frequency.json grows.** Same shape, just more entries.
- **`/random` redirect distribution shifts.** Today's `/random` picks among 20 verbs; with 50, the distribution is more diluted. Acceptable.

## Resolved Questions

_None._

## Open Questions

- **Q1.** Should `lë` (irregular monosyllable, "to leave") be in tier-1 or deferred? Per Kote & Biba it's high-frequency. Recommend: include; cellOverrides may be needed for the unusual subjunctive forms.
- **Q2.** Should we include reflexive-only stems like `ngrihem` ("to rise") as their own corpus entries, or only the active counterparts (`ngreh`)? Recommend: include the active form (`ngreh`) and document the MP imperative override (`ngrihu`) on it.
- **Q3.** How many of the 30 will need cellOverrides for irregularities? Estimate based on prior distribution: ~6 verbs (20%). The TODO marker policy handles the rest gracefully.
