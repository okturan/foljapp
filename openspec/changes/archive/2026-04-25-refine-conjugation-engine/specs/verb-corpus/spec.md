## ADDED Requirements

### Requirement: VerbEntry supports optional cellOverrides

The `VerbEntry` Zod schema SHALL accept an optional `cellOverrides` field of type `Record<string, Record<CellLabel, string>>`. The outer key is `<mood>.<tense>` (e.g., `indicative.aorist`, `subjunctive.present`, `optative.present`, `imperative.present`); the inner key is a cell label (`1sg`, `2sg`, `3sg`, `1pl`, `2pl`, `3pl`); the value is the fully-inflected surface form (including any required mood particles).

#### Scenario: A verb with cellOverrides parses cleanly

- **WHEN** the consumer parses an entry containing `cellOverrides: { "indicative.aorist": { "1sg": "desha" } }`
- **THEN** `verbEntrySchema.parse(...)` SHALL succeed
- **AND** the parsed result's `cellOverrides["indicative.aorist"]["1sg"]` SHALL equal `"desha"`

#### Scenario: cellOverrides with an unknown cell label fails parsing

- **WHEN** the consumer parses an entry containing `cellOverrides: { "indicative.aorist": { "9sg": "x" } }`
- **THEN** the schema SHALL reject the entry with a Zod validation error

### Requirement: All seed verbs match Kaikki at 100%

Every verb in the seed corpus SHALL produce engine output that matches Kaikki/Wiktionary's tagged conjugation tables for every cell Kaikki enumerates. The verification baseline is `scripts/verify-engine.ts`; the canonical match rate is documented in `packages/engine/docs/sources.md`.

#### Scenario: verify-engine reports 0 mismatches

- **WHEN** the developer runs `npx tsx scripts/verify-engine.ts` against the seeded corpus
- **THEN** the summary SHALL report `mismatches: 0` across all 20 verbs
- **AND** any subsequent corpus or engine change that introduces mismatches SHALL be either fixed or explicitly justified in its change proposal
