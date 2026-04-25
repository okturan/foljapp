## Why

`add-ipa-stress-marking` shipped with a default rule (penultimate stress with a Class 1 -j-lemma final-stress exception) plus a single-entry override registry (`data/stress-overrides.json` for `është` only). The default rule + heuristic correctly handles ~85% of forms in the v0.1/tier-1 corpus, but the remaining ~15% drift undetected because nothing audits stress.

Specifically:
- Several lemmas not ending in `-j` carry final or antepenultimate stress (Latin / Greek borrowings, irregular natives like `përdor`, `kafe`).
- Aorist 3sg of Class 1 -j verbs (e.g., `punoi`, `lexoi`) is final-stressed but currently produced as penultimate by the heuristic.
- Some MP forms have stress patterns not covered by the heuristic.

This change audits every corpus verb's IPA output against an explicit reference set and grows `data/stress-overrides.json` to cover documented divergences. It also adds `scripts/audit-stress.ts` as a regression gate so future drift is caught at build time.

## What Changes

- **Add** `scripts/audit-stress.ts` — iterates every corpus verb's lemma + principal-parts + a sample of conjugated forms, prints engine IPA output. Compares against a reference set hand-curated from Newmark (1982) §2.4 and Buchholz & Fiedler (1987) §1.2.3. Surfaces divergences for human review.
- **Audit pass**: humans run the audit and add per-form override entries to `data/stress-overrides.json` for each documented divergence.
- **Document** the audit's reference sources in `data/stress-overrides.json`'s top-level comment.
- **Tighten** `placeStress` heuristic where a clear systematic exception is identified (e.g., aorist 3sg of -j verbs being final-stressed). For one-off exceptions, use the registry rather than the heuristic.
- **Add** a vitest scenario that re-runs the audit and fails CI if any unflagged divergence resurfaces.

## Capabilities

### Modified Capabilities

- `pronunciation`: The "Default stress placement is penultimate" requirement gains scenarios for documented systematic exceptions (e.g., -j-aorist-3sg). The override registry's contract is tightened: every entry SHALL cite its source.

## Impact

- **Code** — `scripts/audit-stress.ts` (new), `apps/web/lib/stress.ts` (heuristic refinement if a systematic pattern is identified), `apps/web/lib/ipa.ts` (no change anticipated).
- **Data** — `data/stress-overrides.json` extended with ~15-30 hand-curated entries.
- **Tests** — vitest audit scenario; new stress-test cases in `apps/web/lib/stress.test.ts`.
- **APIs** — `/api/verbs/[lemma]?format=json` `ipa` field gains stress marks where overrides apply (additive within existing IPA strings).
- **Linguistic claims** — every override entry cites its source.
- **Audience tier** — Learners benefit most (correct stress is essential for spoken Albanian).

## Non-Goals

- **No secondary-stress marking.** Single primary stress only.
- **No phonetic stress (allophonic vowel reduction in unstressed syllables, length variation).** Phonemic level only.
- **No prosodic / phrasal stress.** Single primary stress per word.
- **No dialectal stress variants.** Standard Albanian only.
- **No automatic stress detection from corpus frequency or ML.** Hand-curation only.
- **No exhaustive coverage of Albanian's full vocabulary.** Just the 100 (or 200 post-tier-3) verbs in our corpus + their derived forms.
- **No exposure of "default vs override" provenance in user-facing UI.** The registry is internal; users see correct stress regardless.

## Sequence

```
PREREQ → add-ipa-stress-marking          (the syllabifier + default rule + initial registry)
PREREQ (recommended) → expand-verb-corpus-tier-3   (more verbs to audit)
THIS   → expand-stress-override-registry
```

The change can land in stages by sub-batch (audit one mood/tense at a time), but the spec scope is the corpus-wide audit + resulting registry growth.
