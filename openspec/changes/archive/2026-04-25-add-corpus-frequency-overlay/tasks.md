## 1. Pre-flight

- [ ] 1.1 Read proposal.md, design.md, and the three spec files; confirm scope is unchanged

## 2. Frequency data

- [ ] 2.1 Create `data/verbs/frequency.json` with entries for all 20 seed verbs
- [ ] 2.2 Each entry: `{ tier, udCount?, notes? }`
- [ ] 2.3 Cite the methodology rationale in `notes` per entry where helpful

## 3. Frequency loader

- [ ] 3.1 Create `apps/web/lib/frequency.ts` exporting `FrequencyTier`, `FrequencyEntry`, `FREQUENCY` map, `getFrequency(verbId)`
- [ ] 3.2 Imports JSON statically so it ships in the bundle (works in Server + Client)
- [ ] 3.3 Vitest coverage: every corpus verb has an entry; every tier is one of the four allowed values

## 4. Verb-page badge

- [ ] 4.1 Update `apps/web/components/reserved-actions.tsx`: replace the disabled `Frequency: —` button with an enabled badge `Frequency: <tier>` with a tooltip describing the tier
- [ ] 4.2 Tier-styled badge classes (subtle color cue: core = stronger, rare = muted)

## 5. Browse column

- [ ] 5.1 Update `apps/web/components/browse-table.tsx` to add a sortable `frequency` column
- [ ] 5.2 Sort order treats tiers ordinally: core < common < uncommon < rare for ascending

## 6. API JSON

- [ ] 6.1 Update `apps/web/app/api/verbs/[lemma]/route.ts` to include `frequency` field
- [ ] 6.2 Update `apps/web/lib/api-shapes.ts` `ApiVerbDetailResponse`

## 7. Methodology note on /references

- [ ] 7.1 Add a "Frequency methodology" section to `apps/web/app/references/page.tsx` describing the four-tier system and rationale

## 8. End-to-end tests

- [ ] 8.1 Add `apps/web/e2e/frequency.spec.ts` covering: /verb/jam shows `Frequency: core`; /verb/djeg shows `Frequency:` + uncommon|rare; /browse has Frequency column with all 20 verbs; /api/verbs/jam JSON has frequency.tier === "core"

## 9. Validation and handoff

- [ ] 9.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green
- [ ] 9.2 Update specs if implementation surfaced clarifications
- [ ] 9.3 `openspec validate add-corpus-frequency-overlay --strict` — zero errors
