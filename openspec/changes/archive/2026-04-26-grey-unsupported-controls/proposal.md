## Why

The playground currently lets users click any radio combination and reports "unsupported cell" after the fact. The screenshot example: `punoj` + `imperative` + `middle-passive` + `2pl` + `interrogative` produces an unsupported cell because punoj has no MP imperative (only verbs with explicit `cellOverrides` like `laj`/`shoh` do). The user has to discover the constraint by trying it.

There are two distinct classes of constraint:

1. **Universal grammatical constraints** (always-true regardless of verb):
   - Imperative restricts Person to 2.
   - Imperative has only one tense (present).
   - Non-finite forms have no person/number/voice/polarity/modality axis.

2. **Per-verb engine constraints** (depends on the selected verb):
   - MP imperative requires `cellOverrides` — most verbs lack it.
   - Some verbs lack specific MP cells per paradigm.
   - `engine.table(verbId)` is the source of truth: a cell is feasible iff the table contains a value for `${person}${number}.${voice}` under that mood/tense.

   (Note: defective verbs like `duhet` are NOT covered by this change — the engine produces all 6 person/number cells for them. Their impersonality is a semantic constraint documented in the verb's `notes`, not an engine-side feasibility decision.)

Today the playground partially handles class 1 (Tense options track the selected mood; Person resets to 2 on imperative-mood selection — but the buttons aren't disabled, so a user can re-click Person `1` mid-flow and get unsupported). It doesn't handle class 2 at all.

This change makes the constraints visible *before* the user tries — non-viable buttons render as greyed-out and don't respond to click, plus a tooltip explains why.

## What Changes

- **Compute a feasibility map** per verb in `apps/web/components/playground.tsx` from `engine.table(verbId)` (already imported). The map answers: for each `(mood, tense, voice, cellLabel)` and each non-finite `form`, is there a value present?
- **Derive per-button disabled state** from the feasibility map and the current selection:
  - **Mood**: enabled iff the verb has *any* cell under that mood (or the relevant non-finite forms for `non-finite`).
  - **Tense**: only the tenses valid for the current mood are rendered (today's behavior). Among those, enabled iff the verb has *any* cell under `(mood, tense)`.
  - **Voice**: enabled iff the verb has at least one cell under `(mood, tense, voice, *)`.
  - **Person**: enabled iff the verb has at least one cell under `(mood, tense, voice, person, *)` for the current voice.
  - **Number**: enabled iff `(mood, tense, voice, person, number)` exists exactly.
  - **Form (non-finite)**: enabled iff the verb has the form populated (always true today, but cheap to check).
  - **Polarity, Modality**: always enabled (post-engine transforms; never trigger UnsupportedCellError).
- **Extend `RadioGroupProps.options`** with an optional per-option `disabled?: boolean` field. The `RadioGroup` renders disabled options with reduced opacity, no hover, `cursor-not-allowed`, and a `title` tooltip ("not a standard form for this verb").
- **Disabled buttons don't respond to clicks** (the inner `<input>` carries the native `disabled` attribute). Power users can still reach unsupported cells by hand-editing the URL — preserves the engine's pedagogical "unsupported cell" message for explicit exploration.

## Capabilities

The change extends `interactive-playground` with one new requirement (feasibility-driven control state). No data, engine, or other-capability changes.

## Impact

- **Code** — `apps/web/components/playground.tsx` (compute feasibility, propagate disabled flags). `RadioGroup` helper inside the same file gains per-option disabled support.
- **Tests** — one e2e in `apps/web/e2e/playground-feasibility.spec.ts` covering: punoj + imperative greys MP voice and persons 1/3; laj + imperative keeps MP enabled; verb switch from laj→punoj re-greys MP if imperative is currently selected.
- **No engine, data, API, or routing changes.**
- **Audience tier** — All audiences benefit. Learners avoid frustrating dead-ends; researchers see the per-verb feasibility profile at a glance.

## Non-Goals

- **No change to engine behavior or the "unsupported cell" message.** When a user does navigate to an unsupported combination (via URL hand-editing), the existing message still shows.
- **No greying of Polarity or Modality.** Those always succeed because they're post-engine string transforms.
- **No semantic constraints beyond what the engine reports.** E.g., subjunctive + interrogative is grammatically odd but compositionally constructible — we don't grey it (the engine accepts it).
- **No animation** when buttons transition between enabled/disabled.
- **No restyling** of the existing enabled / selected / hover states.

## Sequence

```
PREREQ → improve-playground-option-grid       (within-group layout)
PREREQ → improve-playground-control-density   (across-group layout)
PREREQ → fix-playground-full-corpus           (full corpus available client-side)
THIS   → grey-unsupported-controls
```
