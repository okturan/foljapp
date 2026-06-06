## Why

`scripts/verify-engine.ts` is the canonical regression check the project relies on (`packages/engine/docs/sources.md`, `CLAUDE.md` "Engine verification"). It silently failed to surface real engine bugs across two paradigm-correctness changes this session (`fix-mp-aorist-3sg` and `align-mp-cells-with-husic`) because of two structural defects:

1. **`FINITE_TENSE_KEYS` (lines 265-289) probes voice='middle-passive' only for `optative.present` and `admirative.{present,imperfect,perfect,pluperfect}`.** Every other mood/tense pair is implicitly probed at active voice only. The Husić-direct cache for `bej.MP.aorist.3sg = "u bë"`, `djeg.MP.indicative.present.1sg = "digjem"`, etc. never got compared to engine output — so when the engine produced `u bëri`/`djegem`/etc., the cells were classified as `missing-kaikki` ("no source has ground truth") instead of `mismatch`. Both of those bugs sat in the corpus for years until a user spotted one by inspecting a verb page.

2. **`formMatchesVoice` (lines 192-210) doesn't recognize MP forms behind mood particles.** `të lexohem` (subjunctive present MP) and `do të lexohem` (conditional present MP / future MP) start with `të ` / `do të ` rather than `u ` or `qenkam`/`jam`, so the surface-shape filter rejects them. Any MP probe for subjunctive or conditional that lands on an MP-shaped Kaikki form silently filters away.

Combined, these two defects mean: **even when Husić-direct or Kaikki has authoritative MP ground truth, verify-engine never compares it for ~80% of MP cells.** The two recent changes had to introduce ad-hoc audit scripts (cell-by-cell forward-membership checks) to surface the bugs, because the canonical verifier couldn't.

## What Changes

- **`scripts/verify-engine.ts`** — extend `FINITE_TENSE_KEYS` to include MP variants for indicative `{present, imperfect, aorist, perfect, pluperfect, future}`, subjunctive `{present, imperfect, perfect, pluperfect}`, and conditional `{present, perfect}`. (Optative present MP and admirative {present, imperfect, perfect, pluperfect} MP entries already exist.)
- **`scripts/verify-engine.ts`** — extend `formMatchesVoice` to strip leading mood particles (`të `, `do të `, `do `) before applying the MP-shape detector. This lets MP forms with subjunctive/conditional/future particles match correctly.
- **Triage surfaced mismatches.** Running the extended verifier will reveal cells where engine output disagrees with ground truth that verify-engine wasn't checking before. Each surfaced mismatch is one of:
  - A new engine/corpus bug — fix it in this change if scoped, defer to a follow-up if architectural.
  - A genuine source disagreement (Kaikki ↔ Husić, dialectal variant, orthographic difference) — document it in `packages/engine/docs/sources.md`.
  - A cache parser artifact (e.g., the `iki.jsonl` jam-paradigm contamination noted in the prior change's open questions) — note in this proposal's design and exclude or fix the cache.
- **Refresh baseline** — record the new (likely larger denominator, possibly different match-rate) totals in `packages/engine/docs/sources.md`.

## Capabilities

This change extends the **`conjugation-engine`** capability with a verification-coverage requirement: the canonical verifier SHALL compare engine output against authoritative sources for both active and middle-passive voice across every supported mood/tense combination, not just the existing subset.

## Impact

- **Code** — `scripts/verify-engine.ts` (~25 additions to `FINITE_TENSE_KEYS`, ~5 lines added to `formMatchesVoice`).
- **Tests** — none directly. The verifier itself is the test infrastructure; correctness is judged by triaging the mismatches it now surfaces.
- **Baseline** — likely shifts. New denominator (more cells probed). New match count (some currently-missing cells become matches via Husić-direct surface-shape filter). New mismatch count (engine bugs that were hidden become visible).
- **Visible UX** — none directly. This is verifier infrastructure.
- **Audience tier** — internal/maintainer benefit: every future change gets MP-cell regression coverage automatically.

## Non-Goals

- **No engine refactor.** Surfaced engine bugs are spec'd as separate changes if scoped to specific verbs/cells. This change is purely about verification coverage.
- **No new ground-truth sources.** We're using existing Kaikki + Husić caches.
- **No `audit-mp-coverage.test.ts` deprecation.** That test enforces u-prefix presence on every MP cell — different invariant. It stays.
- **No fix for the `iki.jsonl` cache contamination.** Documented as a known issue in the prior change; out of scope here. If the broader verifier surfaces issues from that contamination, we suppress them at the cache-skip level rather than fix the parser.
- **No verifier output-format overhaul.** Per-source breakdown stays as the single line we already emit. A "by-voice breakdown" would be useful but is a separate change.

## Sequence

```
PREREQ → fix-mp-aorist-3sg            (archived 2026-04-28)
PREREQ → align-mp-cells-with-husic    (archived 2026-04-28)
THIS   → verify-engine-voice-coverage
NEXT   → (depends on triage outcomes — likely targeted bug-fix changes for any newly-surfaced engine errors)
```
