## 1. Pre-flight

- [x] 1.1 Read `proposal.md`, `design.md`, `specs/interactive-playground/spec.md` (delta + base).
- [x] 1.2 Verify `engine.table(verbId)` returns the expected shape: `{ indicative: { present: { '1sg.active': {...}, ... }, ... }, ..., nonFinite: { participle: {...}, ... } }`.

## 2. Feasibility computation

- [x] 2.1 Inside `apps/web/components/playground.tsx`, add `useMemo` keyed on `config.verb` (and the resolved `verbId`) that calls `engine.table(verbId)` and constructs a `Feasibility` object per design D1:
  - `moods: Set<Mood>` — moods with at least one populated cell or non-finite form.
  - `byMood: Map<Mood, { tenses: Set<Tense>, cells: Set<string> }>` — for finite moods, the populated `(tense, voice, cellLabel)` tuples.
  - `nonFinite: Set<NonFiniteForm>` — populated non-finite forms.
- [x] 2.2 Wrap `engine.table()` in a try/catch — if it throws (e.g., for an unknown verb mid-edit), fall back to an empty feasibility (everything disabled). The result panel's existing error path still shows the message.

## 3. Per-control disabled derivation

- [x] 3.1 Build helper functions (or inline expressions) that compute the disabled flag per option for: Mood, Tense, Voice, Person, Number, Form. Apply rules from design D2.
- [x] 3.2 For Voice: enabled iff at least one cell exists under `(mood, tense, V, *)`. The wildcard means we look across all `(person, number)` combos.
- [x] 3.3 For Person: enabled iff `(mood, tense, voice, ${P}${currentNumber})` is in `feasibility.byMood.get(mood).cells`. The current number is fixed; clicking would re-render the page with that person.
- [x] 3.4 For Number: symmetric — enabled iff `(mood, tense, voice, ${currentPerson}${N})` exists.

## 4. RadioGroup component

- [x] 4.1 In `apps/web/components/playground.tsx`, extend `RadioGroupProps.options` shape from `{ value: string; label: string }` to `{ value: string; label: string; disabled?: boolean }`.
- [x] 4.2 Update the `RadioGroup` body so each option:
  - Renders the inner `<input type="radio" disabled={opt.disabled}>`.
  - Adds `title="not a standard form for this verb"` when disabled.
  - Uses the disabled className palette per design D7 when `opt.disabled` is true: `cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300` (and suppresses hover/focus-within styles).

## 5. Wire feasibility into call sites

- [x] 5.1 Update each `<RadioGroup>` invocation in playground.tsx to map its options through a `disabled` predicate using the feasibility map and current config.
- [x] 5.2 Polarity and Modality pass `disabled: false` (or omit) — never disabled.

## 6. Test coverage

- [x] 6.1 Add `apps/web/e2e/playground-feasibility.spec.ts` covering:
  - `verb=punoj&mood=imperative` → Voice MP pill has `disabled` attribute on its inner input; Voice MP label has `cursor: not-allowed` style.
  - `verb=laj&mood=imperative` → Voice MP pill is enabled (no disabled attribute); clicking it produces `lahu` (2sg) or `lahuni` (2pl).
  - `verb=punoj&mood=imperative` → Person 1 and 3 inputs have `disabled`; Person 2 doesn't.
  - Polarity and Modality pills are always enabled regardless of mood.
- [x] 6.2 Confirm `playground-option-grid.spec.ts`, `playground-control-density.spec.ts`, `playground-full-corpus.spec.ts`, and `english-gloss.spec.ts` still pass.

## 7. Validation and archive

- [x] 7.1 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` — all green.
- [x] 7.2 `openspec validate grey-unsupported-controls --strict` — zero errors.
- [x] 7.3 Manual sanity: visit `/playground?verb=punoj`, set mood=imperative, confirm MP pill greys; switch verb to laj, confirm MP pill un-greys; switch back to punoj, confirm MP pill re-greys.
- [x] 7.4 Archive.
