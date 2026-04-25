## Context

After v0.1.0, our engine matched Kaikki on 1183 / 1406 cells (84%). The 223 mismatches were not random; they clustered into well-defined sub-paradigm patterns that the original three-class paradigm system could not express. This change adds an escape-hatch primitive (`cellOverrides`) and uses it to bring the corpus to 100% Kaikki agreement, plus fixes three engine-level paradigm rules that were straightforwardly wrong.

## Goals / Non-Goals

**Goals:**

- 100% Kaikki match on every cell of every seed verb the engine produces.
- A general escape-hatch (`cellOverrides`) that handles per-verb irregularities without proliferating sub-paradigm classes.
- Smart admirative-stem trim that handles all observed participle endings correctly.
- A repeatable verification tool (`verify-engine.ts`) that doubles as a regression baseline.

**Non-Goals:**

- No expansion of the corpus beyond 20 verbs.
- No middle-passive cell overrides (the override key namespace doesn't carry a voice axis at v0.1.x).
- No automatic Kaikki fetching at runtime.
- No CI-level Kaikki gate (network-dependent; `verify-engine.ts` is a manual pre-commit check).

## Decisions

### D1. cellOverrides over sub-paradigm proliferation

Considered: introduce Class 1B, 2D, 2C-marr, 2C-pjek, 2C-flas, 3-irregular sub-paradigms; vs. add a per-cell override mechanism.

Chosen: **per-cell overrides**. Each sub-paradigm pattern is small and verb-specific; encoding them as data on the corpus entry is cheaper than maintaining 6+ paradigm definitions. The override mechanism is also forward-compatible: any future irregular verb can use the same primitive without an engine change.

Trade-off: overrides duplicate forms that a sub-paradigm would derive. Mitigated by Kaikki being the source of truth — overrides are copied directly from Kaikki rather than derived.

### D2. Override applies in two places

The orchestrator's top-level dispatch checks `entry.cellOverrides[mood.tense][cell]` for the requested options. This handles direct conjugation calls. For compound tenses (future, future perfect, conditional), the inner cell is built via `buildSimpleCell`, which also checks overrides for its corresponding `mood.tense` key. A `të ` prefix in the override is stripped at the simple-cell level so the orchestrator can re-prepend mood particles.

This dual check means a single subjunctive-present override (e.g., `"të haje"` for `ha` 3sg) automatically flows through to the future tense (`"do të haje"`) without authoring two overrides.

### D3. Smart admirative trim

The original Class 1 paradigm hardcoded `trim: 1` for admirative cells, which works for `-uar` participles (punuar → punua) but breaks for `-rë` (larë → la, not lar). Class 2 hardcoded `trim: 1` was simply wrong — Class 2 participles end in `-ur` and need `trim: 2`.

Replaced both with a runtime helper `admirativeTrim(participle)` that picks the correct trim based on the participle's surface ending. The function preserves the special case `-rrë` (marr's participle has double-r in the stem; we want to drop only the final ë).

### D4. Override values include mood particles where applicable

For cells whose surface form includes a mood particle (subjunctive `të`, conditional `do të`), the override stores the FULL form: `"të haje"`, not just `"haje"`. The simple-cell consumer strips `të ` before assembling. This trade-off keeps the corpus JSON readable (you can copy-paste from Kaikki without massaging) at the cost of a small string-strip step in the engine.

### D5. Suppletion table corrections in code, not corpus

`shoh`'s admirative was wrong in `suppletion.ts` (parkam → pakam). `jam`'s optative 2pl was wrong in `auxiliaries.ts` (qofshi → qofshit). Both are engine-level constants used recursively by other verbs' compound tenses, so they cannot live as corpus overrides — fixed in the source.

## Risks / Trade-offs

- **[Risk]** Adding cellOverrides for every irregular verb means the engine doesn't learn anything; it just has a bigger lookup table. → **Mitigation:** Acceptable for 20 verbs. When the corpus scales (`expand-corpus`), patterns that recur across many verbs are candidates for new sub-paradigms; one-off irregulars stay as overrides.

- **[Risk]** Overrides for one mood/tense don't compose into related forms when paths bypass `buildSimpleCell`. → **Mitigation:** Verified empirically — verify-engine is the regression net. New cells outside Kaikki's coverage may need future scrutiny.

- **[Risk]** `verify-engine.ts` requires network access to fetch Kaikki entries. → **Mitigation:** Cached locally in `.cache/kaikki/` (gitignored); subsequent runs are offline. CI does not run verify-engine; documented as a developer pre-commit gate.

- **[Trade-off]** Override values bake in current Kaikki/Wiktionary forms, which may evolve. → **Acceptance:** Albanian standard orthography is stable; Wiktionary's coverage matters more than its volatility. Periodic re-runs of verify-engine catch any divergence.

- **[Risk]** Middle-passive cells share `<mood>.<tense>` keys with active cells, so an override applied to active would falsely apply to MP. → **Mitigation:** Engine explicitly skips overrides for MP voice (commented in `buildSimpleCell`). Future change will add a voice axis if needed.

## Migration Plan

Live system has no migration concerns — corpus entries without `cellOverrides` work exactly as before. Adding the field is a no-op for existing readers.

## Open Questions

_None._ All questions raised in v0.1.0 have been resolved by reading Kaikki's tagged tables.
