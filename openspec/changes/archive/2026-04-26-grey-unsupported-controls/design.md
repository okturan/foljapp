## Context

`apps/web/components/playground.tsx` currently:

- Renders all moods, all tenses for the selected mood, both voices, all polarities/modalities, persons 1–3, and both numbers as clickable radio buttons.
- Adjusts state on mood-change to keep things sane (imperative → tense=present, person=2; non-finite → drops tense; etc.).
- Calls `conjugate(verbId, opts)` and renders the result. On `UnsupportedCellError`, sets `unsupported = true` and shows a muted message: "unsupported cell — engine reports this combination is not part of standard Albanian".

The problem is *discovery*. A user who hasn't memorized "MP imperative requires cellOverrides" sees no signal until they click. The screenshot in the proposal shows exactly that scenario for `punoj`.

The engine already publishes the feasibility surface via `engine.table(verbId)`: it returns a `VerbTable` populated only with cells the engine can produce. Cells the engine throws on are absent. We can read this table once per verb and grey out non-viable buttons accordingly.

## Goals / Non-Goals

**Goals:**

- Pre-empt unsupported clicks with a visible disabled state.
- Keep the universal grammatical constraints (imperative→Person 2, non-finite→no agreement) explicit via the same disabled mechanism, replacing the current implicit auto-reset behavior.
- Preserve the "unsupported cell" message for users who reach an invalid cell via URL hand-editing.
- Stay client-side and synchronous — feasibility computation is < 1ms per verb.

**Non-Goals:**

- Greying polarity/modality (always supported).
- Detecting Albanian-grammar oddities the engine accepts (e.g., subjunctive interrogative).
- Animating disabled-state transitions.
- Replacing the `update()` callback's auto-correct behavior on mood change. Both can coexist: `update()` snaps to a valid configuration when the user changes mood; greying communicates the constraints between snaps.

## Decisions

### D1. Feasibility computation

The full feasibility map for a verb is derived from `engine.table(verbId)`:

```ts
type Feasibility = {
  moods: Set<Mood>;
  byMood: Map<Exclude<Mood, 'non-finite'>, {
    tenses: Set<Tense>;
    cells: Map<string, true>;  // key: `${tense}.${voice}.${cellLabel}`
  }>;
  nonFinite: Set<NonFiniteForm>;
};
```

Compute once per verb (`useMemo` on `config.verb`) — O(table size) which is bounded (~80 cells × 6 moods + 5 non-finite). Negligible cost.

Existence rules:
- `moods.has('non-finite')` iff `table.nonFinite` has at least one populated form.
- `moods.has(mood)` iff `table[mood]` has any tense with any cell.
- `byMood.get(mood).tenses.has(tense)` iff `table[mood][tense]` has any cell.
- `byMood.get(mood).cells.has(\`${tense}.${voice}.${cellLabel}\`)` iff that cell is populated.
- `nonFinite.has(form)` iff `table.nonFinite[form]` is populated.

### D2. Per-control disabled rules

Given `feasibility`, current `config = { mood, tense, voice, person, number, form }`, and the candidate `option` for a control:

| Control   | Disabled iff |
|-----------|--------------|
| Mood `M`  | `!feasibility.moods.has(M)` |
| Tense `T` (under current mood) | `!feasibility.byMood.get(mood).tenses.has(T)` |
| Voice `V` (under current mood, tense) | No cell exists under `(mood, tense, V, *)` |
| Person `P` (under current mood, tense, voice) | No cell exists under `(mood, tense, voice, ${P}${currentNumber})` |
| Number `N` (under current mood, tense, voice, person) | No cell exists under `(mood, tense, voice, ${currentPerson}${N})` |
| Form `F` (non-finite) | `!feasibility.nonFinite.has(F)` |

Note Person/Number are checked against the FULL cell-label (combining person + current-number for the Person control; combining current-person + number for the Number control). This makes them precise: e.g., for an imperfect-only-3sg verb, switching number from sg to pl while person=3 should grey "pl" if 3pl is unsupported.

For mood=imperative, this naturally yields:
- Tense control: only `present` is shown (current MOOD_TENSES behavior); enabled.
- Voice MP: greyed if no `imperative.present.middle-passive.*` cells exist.
- Person 1, 3: greyed (no `imperative.present.*.1sg/1pl/3sg/3pl`).
- Number: enabled per-cell as usual.

For mood=non-finite, the control flow already hides per-cell controls (Voice/Polarity/Modality/Person/Number) and shows Form instead. No change.

### D3. RadioGroup option-level disabled

Extend `RadioGroupProps.options`:

```ts
options: Array<{ value: string; label: string; disabled?: boolean }>;
```

Each option's `<label>` and inner `<input>` honor the disabled flag:

- `<input disabled={opt.disabled}>` — native form disable; no click event fires.
- Disabled label className: `cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300` (50%-grey-ish look, no hover).
- Plus `title={opt.disabled ? "not a standard form for this verb" : undefined}` for tooltip.

The RadioGroup is internal to playground.tsx; no other callers to update.

### D4. Universal vs per-verb constraints

The same machinery handles both classes:
- "Imperative + Person 1" is universally invalid → engine produces no cell → `feasibility` reflects it → button disabled.
- "Imperative + MP" is per-verb (depends on cellOverrides) → engine produces cells for `laj`, none for `punoj` → button disabled per-verb.

No special-casing needed. The engine's table IS the truth source.

### D5. Interaction with the `update()` callback

`update()` currently mutates other fields when mood changes (e.g., resetting person to 2 on imperative). We keep this auto-correct because:
- Without it, switching from `(indicative, present, 1, sg)` to mood=imperative would land on `(imperative, present, 1, sg)` which is unsupported. Better to snap to `(imperative, present, 2, sg)`.
- The greying then reflects the snapped state: in imperative mode Person 1 and 3 are visually disabled, person 2 is selected.

Auto-correct + greying are complementary: auto-correct rescues the user from a stale state on mood-change; greying prevents subsequent clicks into an unsupported cell.

### D6. Power-user escape hatch

Disabled buttons don't fire onChange. But the URL is the source of truth — a power user can hand-edit `/playground?verb=punoj&mood=imperative&voice=middle-passive&person=2&number=plural&...` and the page renders the "unsupported cell" message as today. The greying is a UI-only constraint, not a routing constraint.

This preserves:
- The educational "unsupported" message for users who want to deliberately probe.
- Sharable URLs that include unsupported configurations (with the message visible).

### D7. Styling palette

Three states per pill:

| State    | Border         | Background      | Text          | Cursor        | Hover |
|----------|----------------|-----------------|---------------|---------------|-------|
| Selected | `stone-900`    | `stone-900`     | `stone-50`    | `pointer`     | — |
| Default  | `stone-200`    | `white`         | `stone-700`   | `pointer`     | `bg-stone-50` |
| Disabled | `stone-100`    | `stone-50`      | `stone-300`   | `not-allowed` | — |

Disabled state uses `stone-50` as background instead of `stone-100` to keep the page from looking "busy with greys" — it's a subtle cue, not a heavy block-out.

Plus the focus-within ring (from `improve-playground-option-grid`) is suppressed on disabled labels.

## Tradeoffs

- **Discoverability vs. probing.** Greying reduces accidental discovery of the engine's feasibility surface. We compensate with the URL escape hatch.
- **Silent re-render after verb switch.** Switching from `laj` to `punoj` while imperative+MP is selected leaves the URL pointing at the unsupported combo (the buttons grey out, but the form panel still shows "unsupported"). This is correct behavior — the user can either change controls or pick a different verb. No "auto-correct on verb switch" — it would surprise users who deliberately want to compare.
- **No greying of polarity/modality.** Slight inconsistency, but justified: those always succeed.

## Resolved Questions

- **Q.** Should disabled buttons get a tooltip? Yes — `title` attribute. Native browser tooltip is enough; no custom Tooltip component needed.

## Open Questions

- **Q1.** Should disabled buttons announce "disabled" to screen readers via `aria-disabled`? Native `disabled` on the inner `<input>` already conveys this in most ATs; verify in test. If not, add `aria-disabled="true"` on the `<label>`.
- **Q2.** Should the verb-page also hint at the per-verb feasibility (e.g., grey out missing-cell anchors)? Out of scope here; the verb page's missing cells already render as `—`.
