## Why

The v0.1.0 engine satisfied every authored spec scenario but, when measured against Kaikki/Wiktionary's tagged conjugation tables, matched only 1183 of 1406 cells (84%) across the 20 seed verbs. The 223 mismatches were not random; they clustered into known sub-paradigm patterns (Class 1B vowel-stems, Class 2 stem alternation, Class 2D, Class 3 irregulars, suppletive cells). Rather than waiting on a fluent reviewer, this change uses Kaikki as machine-readable ground truth and brings the engine to 1406/1406 cells matched.

## What Changes

### A new corpus-shape primitive: `cellOverrides`

A new optional field on `VerbEntry` mapping `<mood>.<tense>` → cell-label → fully-inflected form. The engine consults overrides BEFORE paradigm dispatch (and inside `buildSimpleCell` for forms that compose into compound tenses, so future/conditional pick up the override transparently).

### Engine-level paradigm corrections

- **Smart admirative-stem trim** based on the participle's actual ending: `-rrë` → trim 1 (preserve `marr`), `-rë` → trim 2 (`larë` → `la`), `-ur` → trim 2, `-uar`/`-ar` → trim 1, `-ë` → trim 1.
- **Class 2 admirative** trims the entire `-ur` suffix (engine bug fixed in `paradigms/class-2.ts`).
- **Auxiliary jam optative 2pl** corrected from `qofshi` to `qofshit`.
- **Suppletive shoh admirative** corrected from `parkam`/etc. to `pakam`/etc.

### Per-verb cellOverrides

Authored against Kaikki for: iki (Class 2D), ha (consonant-stem aorist + irregular optative), rri (similar), dua (39 cells of stem alternation), bej + laj (Class 1B aorist + imperative), djeg + pjek (palatalization in present 2pl + imperfect + imperative), marr (stem alternation marr/merr), flas (three-stem alternation flas/flet/flis + suppletive aorist).

### Verification tooling

`scripts/verify-engine.ts` fetches each verb's Kaikki JSONL, builds a `(mood, tense, person, number) → form` map from its tagged forms, and compares against engine output. Cached locally, gitignored. Documents the canonical regression baseline.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `verb-corpus`: adds the optional `cellOverrides` field to `VerbEntry`. Backwards-compatible — entries without overrides go through the paradigm engine as before.
- `conjugation-engine`: adds the requirement that overrides are consulted before paradigm dispatch and inside `buildSimpleCell`; corrects the admirative-stem trim rule; corrects two specific auxiliary/suppletion forms.

## Impact

- **Code** — `packages/data/src/schema.ts` (Zod), `packages/engine/src/types.ts`, `packages/engine/src/conjugate.ts` (override checks), `packages/engine/src/paradigms/class-2.ts` (admirative trim), `packages/engine/src/auxiliaries.ts` (jam optative), `packages/engine/src/suppletion.ts` (shoh admirative), 9 corpus entries updated with overrides, `scripts/verify-engine.ts` added, `packages/engine/docs/sources.md` updated.
- **Dependencies** — None.
- **APIs** — Public engine API unchanged. Internal: `cellOverrides` available on `VerbEntry`.
- **Linguistic claims** — Every override is sourced from Kaikki/Wiktionary; references in each corpus entry's `sources` array.
- **Audience tier** — All three. Correctness is foundational.

## Non-Goals

- No expansion beyond the 20 seed verbs.
- No middle-passive cell overrides (the override mechanism currently only applies to active voice; MP support deferred).
- No automatic-fetch of Kaikki at runtime; verify-engine is a developer tool.
- No CI-level Kaikki gate; documented as a recommended pre-commit check instead.

## Sequence

```
PREREQ → add-conjugation-engine                  (provides paradigms + suppletion)
THIS   → refine-conjugation-engine                (modifies conjugation-engine + verb-corpus
                                                   to 100% Kaikki match)
NEXT   → expand-corpus (future)                   (scale beyond 20 verbs using the same
                                                   override-driven pattern)
```
