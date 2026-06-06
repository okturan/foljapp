## Context

The engine's `conjugate()` and `table()` paths assume every verb has both active and middle-passive cells across every supported mood/tense. For `jam`/`iki`/`vij`, this assumption is wrong: those verbs have no MP voice in standard Albanian, so paradigm dispatch fabricates malformed forms (`jamem`, `ikem`, `vihem`).

The fix needs three small pieces:

1. A way for the corpus to declare "this verb has no MP voice."
2. An engine guard that respects the declaration.
3. UI/test invariants that gracefully handle the absence.

## Goals / Non-Goals

**Goals:**

- `jam`, `iki`, `vij` no longer produce MP forms anywhere.
- Engine API contract is consistent: requesting an unsupported MP cell throws `UnsupportedCellError` (matching how the engine signals other unsupported configurations like 1sg imperative).
- `verify-engine.ts` reports `match` for these cells (engine throws + no source has truth → outcome is `match` per `probeCell`'s `engineError === 'unsupported' && both null` branch).

**Non-Goals:**

- Class-level transitivity/voice inference. The flag is per-verb, set explicitly.
- Removing the cells from `VerbTable` shape — they remain in the type as `ConjugationResult | undefined`. This matches existing patterns (e.g., imperative cells absent for 1sg/3sg/3pl).
- Dialect coverage where some intransitive verbs accept MP regionally — out of scope, can be re-evaluated per verb.

## Decisions

### D1. Add `noMiddlePassive` to `VerbEntryFlags`

```ts
export interface VerbEntryFlags {
  isSuppletive?: boolean;
  irregularAorist?: boolean;
  hasMutation?: boolean;
  noMiddlePassive?: boolean;  // ← new
}
```

Optional / additive. Existing verbs without this field continue to behave as before.

### D2. Engine guard at orchestrator entry

In `packages/engine/src/conjugate.ts` `conjugate()` near line ~785 (after voice resolution, before any dispatch / override lookup):

```ts
const voice = options.voice ?? 'active';

if (voice === 'middle-passive' && entry.flags?.noMiddlePassive) {
  throw new UnsupportedCellError(
    `${cellLabel(person, number)}/${options.mood}/${voice}`,
    `${entry.id} has no middle-passive voice (flag noMiddlePassive)`,
  );
}
```

Same guard fires regardless of mood/tense because the flag suppresses MP universally.

`table()` builds via `conjugate()` calls wrapped in try/catch (existing pattern), so MP cells become `undefined` for flagged verbs.

### D3. UI compatibility

`apps/web/components/conjugation-table.tsx` and related render code already handle `undefined` cells (imperative tenses skip 1sg/3sg/3pl by the same mechanism). No UI change expected. Verified by running `/verb/jam`, `/verb/iki`, `/verb/vij` post-fix.

### D4. `audit-mp-coverage.test.ts` exclusion

The standing test asserts every MP cell `engine.table()` produces is voice-marked. With the flag in place, flagged verbs produce zero MP cells → trivially passes. But the test's iteration logic relies on cells existing; we update it to skip verbs with `noMiddlePassive: true` explicitly so a future regression where a flagged verb starts producing MP cells gets caught.

```ts
for (const verb of fixtures) {
  if (verb.flags?.noMiddlePassive) continue;  // ← skip flagged verbs
  // ... existing assertions
}
```

### D5. Verbs to flag

- **`jam`** — copula. No MP in standard Albanian.
- **`iki`** — intransitive "to leave/escape." No MP. (Note: Husić cache for iki has jam-paradigm contamination tagged as iki cells; that's a parser bug, not evidence of MP existence.)
- **`vij`** — intransitive "to come." No MP. The `vihem` form belongs to `vë` ("to put"), a separate verb.

Explicitly NOT flagged:
- **`them`** — has real MP (`thuhem`/`thuhet`); needs proper paradigm overrides, deferred.
- **`flas`** — has real MP with stem mutation (Kaikki: `flitet`, `fliten`); deferred.
- Other intransitives (`vdes`, `qesh`, `flej`, etc.) — not verified as having no MP; left alone for safety. If a future audit confirms, they can be flagged.

### D6. cellOverrides interaction

If a verb has `noMiddlePassive: true` AND any `cellOverrides` keyed on `*.middle-passive`, the flag wins (engine throws before checking overrides). This is the correct precedence — the flag means "this verb has no MP, period." If someone later adds an MP override expecting it to take effect, the throw makes the inconsistency visible (rather than silently honoring the override).

In practice, jam/iki/vij currently have no MP overrides, so no interaction.

### D7. Verify-engine outcomes

After the fix, for jam/iki/vij MP cells:

- `engineForm: null`, `engineError: 'unsupported'`
- Husić: nominally null (after we mentally exclude `iki.jsonl` contamination); for jam, Husić has the bare jam-paradigm forms but the post-`verify-engine-voice-coverage` regex tightening rejects them as not-MP-shape.
- Outcome: `match` (per `probeCell` `engineError === 'unsupported' && kaikki/husic both null` branch).

So baseline match-rate ticks up by the count of flagged-MP cells (3 verbs × ~32 MP cells each ≈ 96 cells), and previously-mismatch cells for these verbs become matches.

### D8. Engine version

This is an additive flag + a new throw path. Existing verbs without the flag have unchanged behavior. Engine API is technically broader (new flag) but backwards-compatible. Engine stays at 0.1.0. Corpus bumps 0.1.4 → 0.1.5.

## Tradeoffs

- **Per-verb flag vs. paradigm-level rule.** Per-verb wins because (a) intransitivity isn't trivially derivable from the verb's class (some Class 1 -oj verbs are intransitive, others transitive), and (b) the inventory of "no-MP" verbs is small enough to declare explicitly.
- **Throw vs. silently return undefined.** Throw is the established pattern (`UnsupportedCellError`) for cells the engine can't produce. Silent undefined would surprise callers who expect `conjugate()` to either succeed or throw a typed error.
- **Catch-all flag vs. per-cell suppression.** A more granular flag (e.g., suppress only specific tenses) was rejected — the verbs in scope have no MP at all, not partial MP. If a future verb has partial MP coverage, a different mechanism (e.g., `cellOverrides` returning a sentinel) would be appropriate.

## Resolved Questions

None.

## Open Questions

- **Q1.** Should `audit-mp-coverage.test.ts` actively assert that flagged verbs throw? Adding that would catch a regression where the flag is silently ignored. Worth doing — included in tasks.
- **Q2.** Should `flags.noMiddlePassive` be inferred for verbs the engine is asked to MP-conjugate that would otherwise produce a malformed form (heuristic detection)? No — that's brittle. Explicit lexical knowledge in the corpus is the right model.
