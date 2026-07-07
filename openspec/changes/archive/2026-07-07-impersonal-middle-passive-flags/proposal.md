## Why

The June MP review flagged eight verbs `noMiddlePassive`. For three of
them the evidence now says the flag is too strong — standard Albanian has
the impersonal middle-passive (FGJSH *vetv.*, third person):

- **iki** — *iket* ("one leaves/can leave") appears in **14 retained
  corpus sentences** despite never being a target (incidental attestation,
  the strongest kind).
- **gjezdis** — *gjezdiset* ×3, same incidental pattern.
- **qendroj** — *qëndrohet* is standard (FGJSH; "s'qëndrohet këtu"), and
  the Husić cache documents 132 middle rows. This conflict is also the
  last unexplained block in the verify-engine baseline (62 of the 230
  standing mismatches).

The engine already has the exact concept: `middlePassiveThirdPersonOnly`
(finite MP restricted to third person), shipped in June and used by
`caloj`, `duhet`, `ekzistoj`, `fabrikoj`, with guard tests in
`third-person-only.test.ts`. This change applies it to the three verbs and
teaches the verifier that editorial voice flags are decisions, not bugs.

## What Changes

- **Data** — `iki`, `gjezdis`, `qendroj`: `flags.noMiddlePassive` →
  `flags.middlePassiveThirdPersonOnly`. Third-person MP cells (*iket*,
  *gjezdiset*, *qëndrohet*, imperfects, compounds) conjugate mechanically;
  first/second person MP still refuses. Corpus 0.1.6 → 0.1.7.
- **Verifier policy** — `scripts/verify-engine.ts`: a cell the engine
  refuses because of an editorial voice flag (`noMiddlePassive`, or
  `middlePassiveThirdPersonOnly` on non-third-person MP) SHALL count as a
  match even when a source cache carries a mechanically-generated form,
  with a separate `flag-suppressed` counter keeping the conflicts visible.
  This encodes the `suppress-mp-for-intransitives` doctrine (flags are
  explicit lexical knowledge) instead of reporting each flagged verb as
  dozens of standing mismatches.
- **Docs** — baseline re-recorded in `packages/engine/docs/sources.md`;
  the remaining flagged verbs (`jam`, `vij`, `rri`, `udhetoj`, `duhet`)
  stay unchanged with their revisit evidence noted.
- **Corpus lab** — targets regenerate (three verbs gain third-person MP
  targets) and the rescan chain refreshes all artifacts.

## Capabilities

Extends `verb-corpus`: impersonal-MP verbs SHALL use
`middlePassiveThirdPersonOnly`, and verification SHALL treat editorial
voice-flag refusals as accepted decisions.

## Impact

- **Code** — three verb JSONs, `scripts/build-corpus.ts` version,
  `scripts/verify-engine.ts` (policy + counter). No engine changes.
- **verify-engine** — qendroj's 62 mismatches resolve (third-person cells
  now conjugate and compare; refused persons are flag-suppressed);
  expected standing mismatches 230 → 168 with matches ≥ 19,639.
- **Playground/verb pages** — the three verbs gain third-person MP rows.
- **Audience tier** — learners (real impersonal forms like *iket* render);
  researchers (verification decomposition gets cleaner).

## Non-Goals

- **No flag changes for `jam`, `vij`, `rri`, `udhetoj`, `duhet`** —
  evidence is absent (`udhëtohet` ×0 incidental) or homograph-contaminated
  (*vihet* = vë, *rrihet* = rrah). Revisit with targeted corpus queries.
- **No strict 3sg-only variant** — the existing flag admits 3pl; unattested
  3pl MP cells simply land in the rarity pile like every other unattested
  cell.

## Sequence

```
PREREQ → suppress-mp-for-intransitives (flags), June third-person flags
THIS   → impersonal-middle-passive-flags
NEXT   → (optional) evidence pass for udhetoj/rri impersonals
```
