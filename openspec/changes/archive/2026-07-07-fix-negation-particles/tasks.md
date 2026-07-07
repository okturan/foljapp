## 1. Pre-flight

- [x] 1.1 Confirm sources and evidence: Newmark et al. 1982 / Husić 2002
      (optative negates with `mos`; subjunctive negator follows `të`);
      corpus evidence — engine-order targets raw-zero vs 6,483 `të mos` +
      18,378 bare-`mos` variant matches; 45-form web spot-check.
- [x] 1.2 Confirm pre-fix behavior: `nuk thënçim` / `nuk thëntë` /
      `mos të them` from the live engine.

## 2. Engine

- [x] 2.1 `compose/particle.ts`: optative joins the `mos` branch of
      `selectNegation`.
- [x] 2.2 `conjugate.ts` `applyNegationAndModality`: subjunctive inserts the
      `mos` segment after the leading `të` segment (guarded on
      `meta.particleName === 'të'` + surface prefix, prepend fallback).
- [x] 2.3 `trace.ts`: optative branch added; subjunctive negation step
      narrates the insertion after "të".
- [x] 2.4 `version.ts`: 0.1.0 → 0.1.1.

## 3. Tests

- [x] 3.1 New `negation-particles.test.ts` — 12 tests: optative (jam
      `mos qofsha`, them `mos thënçim`, no-nuk invariant incl. colloquial),
      subjunctive active/MP/suppletive/compound with segment-order
      assertions and the interrogative wrap (`a të mos punoj`), unchanged
      moods (`nuk punoj`, `s' punoj`, `mos puno`, `nuk do të punoja`,
      `nuk punuakam`). The djeg MP case asserts insertion against the
      affirmative (fixture stem differs from corpus); the real-corpus
      surface `të mos digjet` verified in 4.4.
- [x] 3.2 Updated golden-forms pins: `mos të punoj` → `të mos punoj`;
      engineVersion assertion now imports `VERSION`.
- [x] 3.3 `npm test`: 474 passed (was 462).

## 4. Verification + bookkeeping

- [x] 4.1 verify-engine before AND after: 19,639 matches / 230 mismatches /
      12,579 missing — identical, as predicted (Kaikki affirmative-only).
- [x] 4.2 `packages/engine/docs/sources.md`: engine 0.1.1 note recorded.
- [x] 4.3 `.cache/corpus-targets.json` regenerated: 18,912 `të mos …`
      targets, 0 `mos të …`, `mos qofsha` present (105,847 total);
      staleness + rescan note added to `data/corpora/README.md`.
- [x] 4.4 typecheck clean, lint clean, `npm run build` compiles; real-corpus
      spot check: `mos thënçim`, `mos qofsha`, `të mos digjet`,
      `të mos kem punuar`.
- [x] 4.5 `openspec validate fix-negation-particles --strict` passes.
