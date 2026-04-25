## Context

iMekMak's headline UX is the playground: pick a verb, toggle switches, see the form change. foljapp has had everything except the playground itself. With the engine at 100% Kaikki, the corpus shape locked, and the decomposition tooltips already shipping, this change is mostly UI plumbing.

## Goals / Non-Goals

**Goals:**

- Exhaustive control surface — every option `conjugate()` accepts is exposed.
- URL-driven state so any configuration is shareable.
- Live updates with no full-page reload.
- Unsupported cells render gracefully.

**Non-Goals:**

- No engine-trace / derivation panel.
- No favorites, history, side-by-side compare.
- No keyboard shortcuts beyond standard form navigation.

## Decisions

### D1. URL search params as the source of truth

The Client Component reads `useSearchParams()` and writes via `useRouter().push(...)`. State lives in the URL; React state is derived from the URL on every render. This means: shareable links, browser back/forward works, no `useState` mismatch between URL and UI.

Trade-off: every control change triggers a `router.push`, which is a debouncable operation. We use Next's shallow routing (`scroll: false`) to avoid scroll jumps.

### D2. Tense options derived from mood

The control component holds a `MOOD_TENSES` constant mapping each mood to its valid tenses. When mood changes, if the current tense isn't valid for the new mood, default to the new mood's first tense.

### D3. Verb picker reuses search-input

The home page's `<SearchInput>` is exported and reused. We pass an `onSelect(lemma)` callback that updates the URL instead of navigating. To keep the component generic, accept an optional `mode: 'navigate' | 'select'` prop.

Actually simpler: add a sister component `<VerbPicker>` that wraps the same filter logic without the navigation behavior. Less coupling.

### D4. Layout

```
   ┌─────────────────────────────────────────────────────────────┐
   │  foljapp · Home · Browse · Articles · Random                │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │     Playground                                              │
   │                                                             │
   │     ╭─────────────────────────────────╮                     │
   │     │ verb · punoj    [autocomplete]  │                     │
   │     ╰─────────────────────────────────╯                     │
   │                                                             │
   │     Mood:    [Indicative] [Subj] [Cond] [Adm] [Opt] [Imp]   │
   │     Tense:   [Present] [Imperfect] [Aorist] [Perfect] ...   │
   │     Voice:   [Active] [Middle-passive]                      │
   │     Polarity:[Affirmative] [Negative]                       │
   │     Modality:[Declarative] [Interrogative]                  │
   │     Person:  [1] [2] [3]                                    │
   │     Number:  [sg] [pl]                                      │
   │                                                             │
   │     ─────────────────────────────────────────               │
   │                                                             │
   │     punoj                                                   │
   │     ╰─ stem  ╰─ ending                                      │
   │                                                             │
   │     Principal parts: present puno · aorist punua            │
   │                      participle punuar                      │
   │                                                             │
   │     [Copy link]   See full table → /verb/punoj              │
   └─────────────────────────────────────────────────────────────┘
```

### D5. Validation and unsupported cells

The engine throws `UnsupportedCellError` for combinations like imperative + 1sg. The playground catches this error and renders a muted message instead of crashing. The control surface is permissive — invalid combos don't get hidden until the user selects them — because the user might want to discover what's unsupported.

## Tradeoffs

- **URL bloat**: 7+ search params makes URLs ugly. Acceptable for a deep-link feature; could compress later if needed.
- **Re-render cost**: every control change re-renders the form. With 20 verbs and trivial engine work, this is microseconds. Re-evaluate when engine work grows.
- **Copy-link cross-browser**: navigator.clipboard requires HTTPS or localhost. Works in production; locally fine on `localhost`.

## Resolved Questions

_None — all scope is explicit._
