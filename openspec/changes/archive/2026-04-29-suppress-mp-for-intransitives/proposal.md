## Why

Three corpus verbs — `jam` ("to be"), `iki` ("to leave"), `vij` ("to come") — currently emit malformed middle-passive forms because the engine's paradigm dispatch fabricates MP cells for every verb regardless of whether MP exists in standard Albanian. Concretely:

| Verb | Engine MP present 1sg | Reality |
|------|------------------------|---------|
| `jam` | `jamem` | No MP voice — `jam` is the copula. |
| `iki` | `ikem` | No MP voice — intransitive. |
| `vij` | `vihem` | No MP voice — intransitive. (`vihem` is the MP of `vë` "to put", a different verb.) |

The forms render on `/verb/<lemma>` and `/playground` for these verbs and on the playground decomposed-form panel. They are grammatically nonexistent. Native speakers don't say `jamem`/`ikem`/`vihem` for these verbs; the engine invented them by applying class-2 / class-3 MP paradigm rules to verbs that don't take MP.

The recently-archived `verify-engine-voice-coverage` change made the verifier probe MP cells across all moods/tenses; it now surfaces these cases (currently masked by Husić-cache contamination — `iki.jsonl` carries jam-paradigm forms tagged as iki cells, which is a separate parser bug). The cleanest engine-side fix is to mark these verbs as having no MP voice and have the engine refuse to produce MP cells for them.

## What Changes

- **Engine** — add a `noMiddlePassive?: boolean` field to `VerbEntryFlags`. At the `conjugate()` orchestrator entry, before dispatch: if `voice === 'middle-passive'` and `entry.flags?.noMiddlePassive === true`, throw `UnsupportedCellError`. Same guard applies to `table()` so MP cells return `undefined` for these verbs.
- **Corpus** — set `flags.noMiddlePassive: true` on `jam`, `iki`, `vij`.
- **Tests** — extend `audit-mp-coverage.test.ts` to exclude verbs with `noMiddlePassive: true` from the "every MP cell must be voice-marked" assertion (since they have no MP cells to check). Add a regression test verifying engine throws `UnsupportedCellError` for jam/iki/vij MP requests.
- **UI** — no change needed; `conjugation-table` already skips undefined cells, so MP rows for flagged verbs render as empty/hidden naturally. Spot-check on `/verb/jam`, `/verb/iki`, `/verb/vij`.
- **Verify-engine baseline** — match-rate should rise modestly: cells that previously surfaced as `mismatch` (engine emitting nonsense) become `match` (engine correctly throws + no source has the cell).
- **Corpus version** — 0.1.4 → 0.1.5.

## Capabilities

Extends `conjugation-engine` with a new requirement: verbs flagged `noMiddlePassive` SHALL not produce middle-passive cells in any mood/tense. Engine SHALL raise `UnsupportedCellError` for any such request.

## Impact

- **Code** — `packages/engine/src/types.ts` (one field added to `VerbEntryFlags`), `packages/engine/src/conjugate.ts` (one guard near orchestrator entry).
- **Corpus** — three verb JSONs gain `flags.noMiddlePassive: true`.
- **Tests** — one new test, one existing test extended.
- **UI** — verified-only (no code changes expected).
- **API surface** — additive flag; existing verbs unaffected. No breaking change.
- **Audience tier** — researchers and learners both benefit. Removes nonsense forms from public verb pages.

## Non-Goals

- **No `them` MP fix.** `them` ("to say") DOES have MP (`thuhem`/`thuhet`/etc.) — common in passive constructions ("it is said"). Engine currently produces nonsense `themem`/`themet`. Fixing them needs source research (no Husić-direct cache, no Kaikki MP tags); deferred to a follow-up change with proper paradigm data.
- **No `flas` / `terheq` MP fix.** These have real MP forms with stem mutation; needs Husić-direct expansion or proper Newmark transcription. Out of scope here.
- **No engine-wide intransitivity model.** Only verbs known to have no MP get the flag. The flag is per-verb, not derived from class or transitivity heuristics — explicit lexical knowledge.
- **No `iki.jsonl` cache parser fix.** The Husić cache for `iki` contains jam-paradigm contamination noted in prior change open questions. Out of scope here; the flag-based suppression makes verifier output cleaner regardless.

## Sequence

```
PREREQ → fix-mp-aorist-3sg                  (archived 2026-04-28)
PREREQ → align-mp-cells-with-husic          (archived 2026-04-28)
PREREQ → verify-engine-voice-coverage       (archived 2026-04-28)
THIS   → suppress-mp-for-intransitives
NEXT   → (optional) them-mp-paradigm; flas-terheq-mp; iki-cache-cleanup
```
