## Why

The conjugation engine currently produces incorrect Albanian for **middle-passive aorist 3rd-person singular** of every regular verb. The bug: `buildIndicative` builds the MP aorist by prepending `u` to the active aorist form. For 1sg, 2sg, 1pl, 2pl, 3pl this is correct (active and MP share the same person endings). For 3sg it is **wrong**: the active aorist 3sg uses an active-only ending (`-i` / `-u` / `-oi`), but standard Albanian MP aorist 3sg uses the **bare aorist stem** with zero ending.

User-reported example: `lexoj` (to read) — engine produces `u lexoi`, standard Albanian is `u lexua` (e.g., `Libri u lexua dje` = "the book was read yesterday"). The same wrong-pattern applies to all ~150 Class 1 `-oj` verbs in the corpus, plus other classes:

| Verb (class)  | Engine output (wrong) | Standard / Husić-direct (correct) |
|---------------|------------------------|------------------------------------|
| `lexoj` (1A)  | `u lexoi`              | `u lexua`                          |
| `punoj` (1A)  | `u punoi`              | `u punua`                          |
| `bëj` (1B)    | `u bëri`               | `u bë`  (Husić cache, direct)      |
| `çaj` (1B)    | `u çau` (probable)     | `u ça`  (Husić cache, direct)      |
| `bjerr` (2)   | (varies)               | `u buar` (Husić cache, direct)     |
| `hap` (2)     | `u hapi`               | `u hap`                            |
| `pi` (3)      | `u piu`                | `u pi`                             |

The Husić-direct cache files (parsed from his manual via `scripts/parse-husic-pdf.py`) confirm the bare-stem pattern. The engine's incorrect output is currently masked from `verify-engine.ts` because:
- Kaikki/Wiktionary doesn't tag MP forms separately, so MP cells fall under "no ground truth".
- The Husić-derived cache files (40 cross-resolved verbs) were generated from the buggy engine output, so they tautologically match.

The Husić-direct cache files (60 verbs) for cases that DO contain MP aorist 3sg are the ground truth; some of them already mismatch the engine and are silently counted as "no ground truth" because the cell-key encoding excluded them. Either way, the surface form rendered to the user on `/verb/<lemma>` and `/playground` is wrong.

## What Changes

- **Modify** `packages/engine/src/conjugate.ts` `buildIndicative`'s `case 'aorist'` for `voice === 'middle-passive'`. Specifically, when `person === 3 && number === 'singular'`, render `u <bare-aorist-stem>` instead of `u <active-3sg-form>`. The bare aorist stem comes from `entry.principalParts.aorist`. The decomposition SHALL contain the `u` voice-marker segment and a `stem` segment with the aorist stem.
- **Honor `cellOverrides['indicative.aorist.middle-passive']['3sg']`** before falling back to the bare-stem default — supports irregulars that need a different surface.
- **Re-derive** the cross-resolved Husić cache via `scripts/husic-glossary-cross-resolve.ts` so the derived caches reflect the corrected engine output.
- **Add** a regression test (`packages/engine/test/mp-aorist-3sg.test.ts`) asserting `u lexua` / `u punua` / `u bë` / `u hap` / `u pi`.
- **Update** `packages/engine/docs/sources.md` baseline if the verify-engine match-rate changes.
- **Bump corpus to 0.1.3** since regenerating derived caches is technically a corpus-data refresh (engine version stays 0.1.0 — no engine API change, only paradigm correctness).

## Capabilities

The change extends `conjugation-engine` with a new requirement specifying the MP aorist 3sg surface. No other capabilities touched.

## Impact

- **Code** — `packages/engine/src/conjugate.ts` (one targeted dispatch in `buildIndicative`).
- **Cache** — 40 Husić-derived JSONL files regenerated.
- **Tests** — one new vitest in `packages/engine/test/`. Existing audit tests (`audit-mp-coverage.test.ts`) continue to pass since they check for u-prefix presence, not the specific stem form.
- **Visible UX impact** — every Class 1/2/3 verb's MP aorist 3sg cell on `/verb/<lemma>` and `/playground` now shows the grammatically-correct form. English glosses already render correctly (driven by post-engine voice transform).
- **No data, API, or routing changes**.
- **Audience tier** — All audiences benefit. Researchers and learners get correct standard Albanian.

## Non-Goals

- **No change to MP aorist 1sg/2sg/1pl/2pl/3pl.** Those are correct as `u <active-form>`.
- **No change to other moods/tenses.** The bug is specific to indicative aorist MP 3sg.
- **No change to suppletive verbs** (`jam`, `jap`, `shoh`, `vij`, `them`) — they use the suppletion table and aren't routed through `buildIndicative`'s aorist path.
- **No restructuring of `buildIndicative`** beyond the targeted dispatch.

## Sequence

```
PREREQ → add-conjugation-engine
PREREQ → improve-source-citations (Husić-direct cache populated)
THIS   → fix-mp-aorist-3sg
```
