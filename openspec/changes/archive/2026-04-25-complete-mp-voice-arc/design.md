## Context

`buildSimpleCell` ignores the voice argument — by design, since middle-passive cells for indicative present/imperfect have dedicated paradigm rules (`middlePassivePresent`, `middlePassiveImperfect`). For other moods, the historical pattern was: each builder takes voice and either dispatches to a dedicated MP rule or wraps the active dispatch with a u-particle injection.

Three builders forgot to handle MP voice in their initial implementations. Two have been fixed:
- **`buildAdmirative.present` and `.imperfect`** — fixed by `add-mp-admirative-coverage` via `prependUMarker`.
- **`buildImperative`** — fixed by `fix-mp-imperative` via `cellOverrides['imperative.present.middle-passive']`.

The third remains: **`buildOptative.present`**. Empirical confirmation (this turn): `punoj` MP optative present 1sg returns `'punofsha'` (active form), should return `'u punofsha'`.

The audit test introduced by this change makes future regressions impossible: any new mood/tense combination that forgets to handle voice would surface immediately via the audit's "no MP cell silently returns active form" rule.

## Goals / Non-Goals

**Goals:**

- MP optative present produces u-prefixed forms across all six cells, matching Kaikki.
- The audit test catches the buildSimpleCell-ignores-voice bug class for any future builder.
- Verify-engine baseline grows to include MP optative present.
- The MP voice arc is provably complete for v0.x.

**Non-Goals:**

- No new mood/tense support.
- No new paradigm rules.
- No new prependUMarker / particle helpers (existing one is reused).
- No retrofit of historical fixes.

## Decisions

### D1. Fix at the dispatch site

```ts
// Before:
case 'present':
  return buildSimpleCell(entry, 'optativePresentActive', person, number);

// After:
case 'present': {
  const active = buildSimpleCell(entry, 'optativePresentActive', person, number);
  return voice === 'middle-passive' ? prependUMarker(active) : active;
}
```

Identical pattern to `buildAdmirative.present` (post-`add-mp-admirative-coverage`). The fix is one line.

### D2. Audit test design

The audit iterates every voice-tagged cell of `engine.table(verb)` for a representative set of verbs and asserts the form's surface character matches one of three patterns:

```ts
function isVoiceMarked(form: string, mood: string, tense: string): boolean {
  if (form.startsWith('u ')) return true;                // simple MP (u-prefix)
  if (/^(qenkam|qenke|qenka|qenkemi|qenkeni|qenkan|qenkësha|qenkëshe|qenkësh|qenkëshim|qenkëshit|qenkëshin|jam|je|është|jemi|jeni|janë|isha|ishe|ishte|ishim|ishit|ishin|qofsha|qofsh|qoftë|qofshim|qofshit|qofshin|qe|qeshë|qemë|qetë|qenë)\b/.test(form)) return true;  // jam-aux compound
  if (/(hem|hesh|het|hemi|heni|hen|hesha|heshe|hej|heshim|heshit|heshin|em|esh|et|emi|eni|en|esha|eshe|eshim|eshit|eshin|ej)$/.test(form)) return true;  // dedicated MP endings
  return false;
}
```

The third pattern handles MP indicative present/imperfect, where the dedicated `middlePassivePresent`/`middlePassiveImperfect` paradigm rules emit forms like `punohem` (no u-prefix, no jam-aux).

The audit iterates `engine.table(verb)` and applies `isVoiceMarked` to every cell whose key ends in `.middle-passive`.

Verbs tested: `punoj` (Class 1), `flas` (Class 2 with cellOverrides), `shoh` (suppletive), `pjek` (mutating). Four verbs cover the paradigm space sufficiently.

### D3. Why the audit doesn't replace the verify-engine pass

The audit is a fast, surface-pattern-based regression catcher. It detects the silent-active-form bug class. It does NOT verify that the MP form is correct (only that it's voice-marked).

`verify-engine.ts` does the correctness verification by comparing engine output to Kaikki. The two are complementary: audit catches structural bugs in the builder dispatch; verify-engine catches surface-form correctness.

### D4. Compound tenses in optative — already correct

`buildOptative.perfect` already uses `aux = voice === 'middle-passive' ? 'jam' : entry.auxiliary` correctly. The MP perfect of `punoj` produces `qofsha punuar` (jam optative present + participle). No fix needed there.

### D5. No paradigm-rule additions

There's no `middlePassiveOptativePresent` paradigm rule, and there shouldn't be — the MP form is mechanically derivable as `u + active`. Adding a rule would duplicate information and introduce a maintenance burden.

### D6. Expanding to other moods (future)

If a future mood/tense combination is added, the audit will surface any voice-handling oversight automatically. This makes the audit a permanent regression gate.

## Tradeoffs

- **The audit's pattern-matching is heuristic.** A novel MP morphology pattern not in the regex would falsely fail the audit. Acceptable: Standard Albanian's MP morphology is closed; new patterns are extremely unlikely without an engine change.
- **The audit runs on a fixed verb set.** Verbs not in `['punoj', 'flas', 'shoh', 'pjek']` aren't audited. Acceptable: those four verbs exercise all 3 classes + suppletion + mutation; the audit is structural, not corpus-wide.
- **MP optative present is rare in actual usage.** The user-facing impact is small. The fix is still right because incorrect output is worse than rare MP forms.

## Resolved Questions

_None._

## Open Questions

_None._
