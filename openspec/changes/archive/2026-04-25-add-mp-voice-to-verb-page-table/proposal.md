## Why

Engine and UI are out of sync. Since `add-mp-admirative-coverage` landed, `engine.table()` populates both `<cell>.active` and `<cell>.middle-passive` keys for every supported cell (`packages/engine/src/conjugate.ts:947`). The verb-page conjugation table reads only the active key (`apps/web/components/conjugation-table.tsx:78`), so middle-passive forms are invisible on `/verb/[lemma]`.

This makes a sizeable chunk of correctly-computed Albanian morphology a hidden API. Researchers and students who land on `/verb/flas` see Indicative > Imperfect 3sg as `fliste` (active) — but `flitej` (MP) is missing. Same gap on every mood that has MP forms. The MP forms are accessible via `/playground` (with `voice=middle-passive`) and via `/api/verbs/[lemma]`, but the canonical reference page hides them.

The fix is rendering. No engine work, no schema work.

## What Changes

- **Modify** `apps/web/components/conjugation-table.tsx` so that, for every tense row, if at least one cell has a `<cell>.middle-passive` entry in the `engine.table()` result, the table renders an additional row immediately below the active row, with the same six person/number columns and the same `<DecomposedForm>` rendering. The MP row's tense-label cell SHALL carry an explicit voice marker (e.g., a small subscript `MP` badge) so screen readers and sighted users can disambiguate.
- **Cell IDs** for MP cells SHALL be `<mood>-<tense>-<cell>-mp` (suffix differentiator). Existing active cell IDs (`<mood>-<tense>-<cell>`) remain unchanged so existing deep-links don't break.
- **Empty MP rows** (no MP cell exists for the tense) SHALL be skipped — no row of dashes.
- **Imperative** mood is unaffected (engine has no MP imperative).
- **Non-finite forms** are unaffected (single-voice).

## Capabilities

### Modified Capabilities

- `reference-pages`: The "Full conjugation table — all moods rendered" requirement gains an explicit clause covering both voices, with scenarios verifying MP rendering for `/verb/flas` (admirative imperfect MP) and `/verb/punoj` (indicative imperfect MP).

## Impact

- **Code** — `apps/web/components/conjugation-table.tsx` only.
- **Dependencies** — None.
- **APIs** — None (the JSON API already includes both voices).
- **Linguistic claims** — None.
- **Audience tier** — Students and researchers benefit most; learners see correctly-grouped active/MP pairs which aids paradigm-recognition.

## Non-Goals

- No voice toggle or filter UI. Both voices SHALL be rendered simultaneously by default.
- No change to the `engine.table()` shape, decomposition format, or cell IDs of active cells.
- No change to the playground, API, or any other route.
- No change to the way IPA, frequency, citations, or actions render.
- No new SVG, icon, or animation. The MP indicator is a textual badge / suffix.
