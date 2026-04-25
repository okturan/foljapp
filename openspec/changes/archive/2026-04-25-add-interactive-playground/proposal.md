## Why

The reference pages show every cell of every verb — passive consumption. The playground inverts the relationship: the user picks any combination of grammatical parameters and sees the engine produce the form live. It is the iMekMak experience translated to the foljapp engine, with role-coded decomposition and tooltips inherited from the verb page.

This unblocks two future capabilities that are easier with a playground:
- `add-practice-mode` (quiz mechanics need a UI for showing forms in isolation)
- `add-engine-trace` + a derivation panel (a single-cell display is the natural surface for "explain how this is built")

## What Changes

- Add `/playground` route as a Server Component that hosts a Client Component for the controls.
- Controls (Client):
  - Verb picker — autocomplete same as the home search input; selecting fills the URL `?verb=<lemma>`
  - Mood (radio): indicative / subjunctive / conditional / admirative / optative / imperative / non-finite
  - Tense (depends on mood; only valid options visible)
  - Voice (radio): active / middle-passive
  - Polarity (radio): affirmative / negative
  - Modality (radio): declarative / interrogative
  - Person (1/2/3) and Number (sg/pl) — disabled when mood is non-finite
  - Form (only shown when mood is non-finite): participle / infinitive / gerund / privative / temporal
  - Colloquial toggle (gates `s'` over `nuk`)
- Output:
  - The conjugated form rendered at large size with role-coded coloring + per-segment tooltips.
  - Below the form: a "principal parts" line showing the verb's stems and auxiliary.
  - Footer: deep-link copy button (`/playground?verb=...&mood=...&...`) and a citation note linking to `/verb/<lemma>`.
- URL state:
  - All controls are URL-driven via search params so any configuration is shareable.
  - Page boots with default `?verb=punoj&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative`.
- Validation:
  - When the user selects an incompatible combo (e.g., imperative + 1sg), the form area shows a muted "engine reports this cell as unsupported" message and links to the relevant capability spec.
- Accessibility:
  - All controls labeled; radios grouped via `<fieldset>`/`<legend>`; keyboard reachable.

## Capabilities

### New Capabilities
- `interactive-playground`: Defines the contract for the playground — URL-driven state, every engine option exposed as a control, role-coded output, copy-link action, accessible markup.

### Modified Capabilities
_None._ The playground composes existing capabilities (`conjugation-engine`, `verb-corpus`, `decomposition`).

## Impact

- **Code** — `apps/web/app/playground/page.tsx` (RSC shell), `apps/web/components/playground.tsx` (Client Component with all controls + state), reuse of existing `<DecomposedForm>` and corpus index.
- **Dependencies** — None.
- **APIs** — None.
- **Linguistic claims** — None (display-layer over engine output).
- **Audience tier** — All three.

## Non-Goals

- No saved configurations / history / favorites.
- No side-by-side comparison of two configurations.
- No engine `trace()` / derivation panel — deferred to `add-engine-trace`.
- No middle-passive overrides (the engine itself doesn't support overrides for MP yet — playground respects that).

## Sequence

```
PREREQ → add-conjugation-engine
PREREQ → add-decomposition
THIS   → add-interactive-playground
NEXT   → add-engine-trace                     (derivation panel under playground)
LATER  → add-practice-mode                     (quiz UI built on playground bones)
```
