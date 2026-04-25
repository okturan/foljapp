## Context

Two related issues coexist in the MP admirative path:

1. **Pre-existing bug**: `buildAdmirative.present` calls `buildSimpleCell(entry, 'admirativePresentActive', ...)` with no voice argument. `buildSimpleCell` itself ignores voice (it dispatches purely on the paradigm tense key). Result: MP admirative present silently returns the active form. Verified empirically — `flas` MP present 1sg returns `folkam` (should be `u folkam`).

2. **Coverage gap**: After `add-admirative-imperfect-pluperfect`, MP admirative imperfect and pluperfect remain unsupported. Their throws were left in place because that change scoped to active voice.

Both issues share the same fix shape (u-particle injection for MP simple tenses; jam-aux composition for MP compound tenses), so they're addressed together.

## Goals / Non-Goals

**Goals:**

- MP admirative present produces `u + active-form` for all 6 cells of all corpus verbs.
- MP admirative imperfect produces `u + active-form` for all 6 cells.
- MP admirative perfect produces `qenkam + participle` for all 6 cells.
- MP admirative pluperfect produces `qenkësha + participle` for all 6 cells.
- Engine maintains 100% match against Kaikki for cells where Kaikki has a surface form.
- verify-engine treats Kaikki's `u —` marker as no-ground-truth (skip).

**Non-Goals:**

- No verb-specific filtering of which MP simple-admirative cells exist. We mechanically produce all 6 even though some grammar references restrict MP admirative-simple to 3rd persons. Rationale: the engine is mechanical; usage notes belong in grammar articles.
- No 3sg `-shte` / Gheg `-kej` variants.
- No re-architecture of `buildSimpleCell` to be voice-aware. The fix wraps the call site in `buildAdmirative` rather than threading voice through the lower-level function. Smaller blast radius.

## Decisions

### D1. u-particle injection at the wrapper, not in buildSimpleCell

Rather than threading voice into `buildSimpleCell` (which would touch every caller across every mood), the fix happens in `buildAdmirative`:

```ts
case 'present': {
  const active = buildSimpleCell(entry, 'admirativePresentActive', person, number);
  if (voice === 'middle-passive') {
    return prependUParticle(active);
  }
  return active;
}

case 'imperfect': {
  const active = buildSimpleCell(entry, 'admirativeImperfectActive', person, number);
  if (voice === 'middle-passive') {
    return prependUParticle(active);
  }
  return active;
}
```

`prependUParticle` is a small helper that wraps a `ResolvedCell` with the `u` particle prefix on both surface and decomposition:

```ts
function prependUParticle(cell: ResolvedCell): ResolvedCell {
  return {
    surface: `u ${cell.surface}`,
    segments: [
      buildSegment({ surface: 'u', role: 'particle', particleName: 'u', voice: 'middle-passive' }),
      ...cell.segments,
    ],
  };
}
```

This mirrors how MP aorist already injects the `u` particle (existing code in the indicative-aorist case for MP voice).

### D2. Compound MP admirative is "free" once the auxiliary table has both keys

After `add-admirative-imperfect-pluperfect` lands, both `kam.admirative.imperfect` and `jam.admirative.imperfect` exist in the auxiliary table. The existing `buildAuxiliaryCell(aux, 'admirative.present' | 'admirative.imperfect', ...)` call site already uses `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary`. Removing the imperfect/pluperfect MP throws is sufficient.

```ts
case 'perfect': {
  const auxForm = buildAuxiliaryCell(aux, 'admirative.present', person, number);
  return { surface: `${auxForm} ${participle}`, segments: [...] };
}

case 'pluperfect': {
  const auxForm = buildAuxiliaryCell(aux, 'admirative.imperfect', person, number);
  return { surface: `${auxForm} ${participle}`, segments: [...] };
}
```

For MP voice, `aux === 'jam'`, so:
- Perfect → `qenkam + participle` (e.g., `qenkam folur`)
- Pluperfect → `qenkësha + participle` (e.g., `qenkësha folur`)

### D3. verify-engine `u —` handling

Kaikki uses the surface `"u —"` (literally a `u` followed by an em dash) to denote "this cell does not exist." Currently, `findKaikkiForm` would either return null (if no row matches) or return a form. If it returns `"u —"` as the form, our engine's actual output (e.g., `"u folkësha"`) won't match, and we'd record a mismatch.

Fix in `scripts/verify-engine.ts`:

```ts
const kaikkiForm = findKaikkiForm(kaikki, spec);
if (kaikkiForm === 'u —') {
  // Kaikki marks this cell as nonexistent; treat as no ground truth.
  return { ...outcome, status: 'missing-kaikki', kaikkiForm: null };
}
```

The match-rate denominator counts only cells with positive Kaikki ground truth. Cells where Kaikki marks `u —` are skipped, identical to cells Kaikki has no entry for.

### D4. Decomposition for MP admirative simple tenses

The segment list for `u folkësha` is:

```
[
  { surface: 'u', role: 'particle', particleName: 'u', voice: 'middle-passive' },
  { surface: 'fol', role: 'stem', voice: 'middle-passive' },
  { surface: 'kësha', role: 'ending', voice: 'middle-passive' },
]
```

The active form's segments are inherited from `buildSimpleCell`; `prependUParticle` adds the `u` particle and propagates `voice` through. (The `voice` field on segments may already be set by `buildSegment`; if not, the helper sets it.)

For compound MP admirative (e.g., `qenkam folur`), the segments are:

```
[
  { surface: 'qenkam', role: 'auxiliary', person, number, voice: 'middle-passive' },
  { surface: 'folur', role: 'stem', voice: 'middle-passive' },
]
```

No `u` particle here — the `qenkam`/`qenkësha` auxiliary inherently encodes voice via the lexical choice of `jam` over `kam`.

### D5. shoh and other suppletives — automatic

The `shoh` suppletive admirative present is `pakam` (per existing suppletion table). For MP: `prependUParticle('pakam')` → `u pakam`. ✓ Matches Kaikki.

For admirative imperfect, `shoh` falls through to the paradigm rule (per add-admirative-imperfect-pluperfect D4): rule-derived `pakësha`. MP: `u pakësha`. ✓ Matches Kaikki.

No suppletion table changes needed.

### D6. The pre-existing MP admirative present bug fix is the testable regression

The spec adds an explicit scenario asserting MP admirative present 1sg of `punoj` is `"u punuakam"` (NOT `"punuakam"`). This is the locked-in regression check for the buildSimpleCell-ignores-voice bug. Once this scenario passes, the bug stays fixed.

## Tradeoffs

- **Mechanical production of all 6 MP simple-tense cells.** Some grammars say MP admirative-simple 1sg/2sg/1pl/2pl forms aren't used. We produce them anyway. Mitigation: grammar-articles capability can carry usage notes; the engine surfaces forms, not usage rules.
- **u-particle injection in the wrapper, not at buildSimpleCell.** Slightly redundant with MP aorist's own u-prefix logic. Acceptable because consolidating would force voice-awareness through buildSimpleCell, a 100x larger refactor for marginal gain. Two callers each doing their own u-prefix is fine.
- **Verify-engine `u —` skip introduces a string-equality check that's brittle if Kaikki ever changes the marker.** Acceptable: the marker is stable in Wiktionary's templates; if it changes, the regression surfaces as mismatches and we adapt.

## Resolved Questions

_None._

## Open Questions

_None at the spec stage. Implementation-time question: do any verbs in the corpus need cellOverrides for MP admirative imperfect to match Kaikki? Likely not given the pattern's regularity, but verify-engine is the gate._
