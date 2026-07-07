## Why

The 2026-04-29 `suppress-mp-for-intransitives` change explicitly deferred
`flas` and `tërheq` as a non-goal: both have real middle-passive paradigms
with stem mutation that the engine cannot derive mechanically. Today the
engine emits \**flaset*, \**flasej*, \**tërheqet*, \**tërheqej* by applying
MP endings to the active present stem; standard Albanian uses the mutated
stems **flit-** and **tërhiq-**: *flitet* ("is spoken" — as in *flitet
shqip*), *flitej*, *tërhiqet*, *tërhiqej* (Newmark, Hubbard & Prifti 1982,
*Standard Albanian*, non-active of the heq-class; FGJSH s.vv. *flas*,
*tërheq*).

The 2026-07-07 middle-passive review isolated these as the only fixable
paradigm defect in the 28,193-cell `needs_middle_passive_attestation` pile:
99% of that pile is admirative/optative/negated compound MP — formally
valid, textbook-only, correctly labeled by the audit — and the remaining
plain-indicative misses spread 6–12 cells each across 87 rare verbs with no
common cause. Corpus evidence for the fix is direct: even the
target-filtered retained DB contains **91 sentences with *flitet*** and
**23 with *tërhiqet***, none of which the engine's current forms can ever
match.

## What Changes

- **`data/verbs/flas.json`** — `cellOverrides` gain
  `indicative.present.middle-passive` (*flitem, flitesh, flitet, flitemi,
  fliteni, fliten*) and `indicative.imperfect.middle-passive` (*flitesha,
  fliteshe, flitej, fliteshim, fliteshit, fliteshin*), the same mechanism
  `djeg`/`pjek`/`marr` already use. A `manual` source entry cites Newmark
  et al. 1982.
- **`data/verbs/terheq.json`** — same two blocks with *tërhiqem … tërhiqen*
  / *tërhiqesha … tërhiqeshin*, plus the citation.
- **Derived cells come free**: subjunctive present MP (*të flitet*, *të mos
  tërhiqet*) reuses the present-MP cells, as verified for `djeg`. MP aorist
  (*u fol*, *u tërhoq*) and participle compounds were already correct and
  are untouched.
- **Corpus version** 0.1.5 → 0.1.6; client bundles rebuilt.
- **Engine test fixtures** for `flas` gain the same overrides and a
  `terheq` fixture is added, with a test suite pinning the mutated MP cells
  and unchanged controls (*thuhet*, *jepet*, *u fol*).
- **Corpus lab**: targets regenerated and the full rescan chain re-run so
  the corrected surfaces (`flitet`-family) become searchable targets.

## Capabilities

Extends `verb-corpus`: verbs with mutated middle-passive stems SHALL carry
sourced cellOverrides for the affected cells.

## Impact

- **Data** — 2 verb JSONs (+24 override cells, +2 source rows); corpus
  0.1.6.
- **Engine code** — none (override mechanism exists); fixtures/tests only.
- **verify-engine** — must hold ≥ 19,639 matches; Kaikki lacks ground truth
  for these MP cells, so the count is expected unchanged.
- **Corpus lab** — target keys for flas/tërheq MP cells change; the rescan
  chain refreshes scan, audit, target-hits, reports, and static examples.
- **Audience tier** — learners/students: *flitet* is a high-frequency form
  (impersonal "it is said/spoken") that the reference previously got wrong.

## Non-Goals

- **No treatment of the other 87 verbs** with sparse plain-indicative MP
  misses — the review found genuine rarity, not a defect; the audit label
  stands.
- **No impersonal-only MP modeling** (the `qendroj` flag-vs-Husić conflict,
  132 cached MP rows against `noMiddlePassive`): needs an engine-level
  concept (MP restricted to 3sg) and its own proposal.
- **No MP admirative/optative expansion** for these verbs beyond what the
  present/imperfect stems derive.

## Sequence

```
PREREQ → suppress-mp-for-intransitives (archived 2026-04-29, deferred this)
THIS   → fix-flas-terheq-mp-stems
NEXT   → (optional) impersonal-only MP modeling for the qendroj class
```
