## Why

`buildImperative` in `packages/engine/src/conjugate.ts:545–582` ignores its surrounding voice argument. When the engine is asked for an MP imperative cell (e.g., `flas` MP imperative 2sg), it falls through to `paradigm.imperativeActive[cell]` and returns the active form (often without the cellOverrides that fix active-imperative quirks, producing nonsense like `flas` MP-2sg = `flas` instead of the active `fol` or a proper MP form). Same family of bug as `buildSimpleCell`-ignores-voice (already fixed for admirative by `add-mp-admirative-coverage`).

The downstream UI (`conjugation-table.tsx`) currently masks the bug by skipping MP rendering for the imperative table entirely. That workaround should disappear once the engine is honest: most verbs throw `UnsupportedCellError` for MP imperative; verbs that DO have an MP imperative (`laj` → `lahu/lahuni`, `shoh` → `shihu/shihuni` in the seed corpus) carry per-verb cellOverrides.

## What Changes

- **Modify** `buildImperative(entry, person, number)` to `buildImperative(entry, person, number, voice)`. For `voice === 'middle-passive'`:
  - Look up `entry.cellOverrides?.['imperative.present.middle-passive']?.[cell]`. If present, return that form as a single-segment cell.
  - Otherwise throw `UnsupportedCellError(cell + '/imperative/middle-passive', '...')`.
- **Update** the `case 'imperative'` site in the orchestrator to pass `voice` through.
- **Add** `imperative.present.middle-passive` cellOverrides to:
  - `data/verbs/laj.json`: `{ "2sg": "lahu", "2pl": "lahuni" }` (verified against Kaikki).
  - `data/verbs/shoh.json`: `{ "2sg": "shihu", "2pl": "shihuni" }` (verified against Kaikki).
- **Remove** the `!imperativeOnly` MP-skip workaround in `apps/web/components/conjugation-table.tsx`. The natural `hasMp` check is now correct: imperative tables for verbs without MP overrides won't have any MP cells, so `hasMp` is false and no MP row renders. Verbs with MP overrides (laj, shoh) get a properly-rendered MP imperative row.
- **Extend** `scripts/verify-engine.ts` cell list to probe imperative cells for both voices, so the new MP imperative cells are part of the regression baseline.

## Capabilities

### Modified Capabilities

- `conjugation-engine`: The "Imperative mood coverage" requirement gains MP-voice scenarios (laj `lahu`/`lahuni`, shoh `shihu`/`shihuni`, others throw).
- `reference-pages`: The MP-imperative `imperativeOnly` workaround comment is removed; the requirement that MP rows render where MP cells exist now holds for imperative too. (Spec scenarios for laj/shoh imperative MP rendering added.)

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (buildImperative voice-aware), `apps/web/components/conjugation-table.tsx` (remove imperativeOnly hack), `data/verbs/laj.json`, `data/verbs/shoh.json` (cellOverrides).
- **Tests** — vitest scenarios; e2e for `/verb/laj` showing `lahu` in imperative MP row.
- **APIs** — None broken. `/api/verbs/[lemma]` JSON now contains real MP imperative cells for laj/shoh; for other verbs the cells stay absent.
- **Linguistic claims** — Each MP imperative form is verified against Kaikki / Wiktionary.
- **Audience tier** — All three. Researchers get morphologically correct paradigms; learners get explicit reflexive imperatives.

## Non-Goals

- No expansion of MP imperative coverage beyond `laj` and `shoh`. Other corpus verbs (`punoj`, `flas`, `hap`, etc.) don't have attested MP imperatives in Kaikki — leaving them unsupported is faithful to Standard Albanian usage.
- No paradigm-rule MP imperative formation. We could derive `<stem>+hu` mechanically (e.g., `puno + hu = punohu`), but Kaikki doesn't list those for most verbs, suggesting they're not standard. We stay faithful to Kaikki rather than over-produce.
- No change to the active-imperative behavior or the `cellOverrides` of active forms.
- No changes to the playground (it already exposes voice via the URL; MP imperative will start producing forms for laj/shoh and throwing for others).
