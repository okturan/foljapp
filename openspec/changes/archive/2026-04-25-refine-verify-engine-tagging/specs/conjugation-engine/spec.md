## MODIFIED Requirements

### Requirement: verify-engine covers admirative imperfect and pluperfect

The `scripts/verify-engine.ts` cell list SHALL include `{ mood: 'admirative', tense: 'imperfect' }` and `{ mood: 'admirative', tense: 'pluperfect' }` for active voice across all corpus verbs. The match-rate baseline recorded in `packages/engine/docs/sources.md` SHALL be updated to the new total (current cells + new admirative cells), and the verification script SHALL maintain a 100% match against Kaikki for these new cells.

The script SHALL ALSO maintain accurate Kaikki tag mapping for moods Kaikki tags non-canonically:

- For `(mood: 'conditional', tense: 'present')` the wanted tag set SHALL include `'imperfect'` (Kaikki tags the construction `do të punoja` with `imperfect` because the verb form is the imperfect indicative).
- For `(mood: 'conditional', tense: 'perfect')` the wanted tag set SHALL include `'past'` and `'perfect'` (Kaikki tags `do të kisha punuar` with `past + perfect`).
- For all other moods the existing tag mapping SHALL remain unchanged.

The "past-disambiguation" filter in `findKaikkiForm` SHALL be mood-agnostic: a Kaikki form tagged `past` SHALL match only when the wanted tag set also includes `past`. The existing implementation `if (spec.tense === 'perfect' && ftags.has('past')) continue;` SHALL be replaced by `if (!wanted.has('past') && ftags.has('past')) continue;`, which produces equivalent behavior for indicative/subjunctive perfect (no past wanted → skip past-tagged forms) and correct behavior for conditional perfect (past wanted → don't skip).

#### Scenario: verify-engine reports admirative imperfect for every corpus verb

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **THEN** the output SHALL include at least one match for `admirative.imperfect` per corpus verb that has Kaikki coverage
- **AND** zero mismatches SHALL be reported for `admirative.imperfect` and `admirative.pluperfect` cells

#### Scenario: Match-rate baseline is updated

- **WHEN** the change is archived
- **THEN** `packages/engine/docs/sources.md` SHALL no longer mention "admirative imperfect/pluperfect not implemented in v0.1.0" as a deferred item
- **AND** the recorded baseline match-rate SHALL reflect the expanded cell count

#### Scenario: Conditional present cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **AND** the cell list contains `{ mood: 'conditional', tense: 'present' }`
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional present 1sg cell (e.g., `punoj` → `do të punoja`)
- **AND** zero mismatches SHALL be reported for conditional present cells

#### Scenario: Conditional perfect cells match Kaikki

- **WHEN** `npx tsx scripts/verify-engine.ts` is run after this change is implemented
- **AND** the cell list contains `{ mood: 'conditional', tense: 'perfect' }`
- **THEN** the script SHALL report a positive match for at least one corpus verb's conditional perfect 1sg cell (e.g., `punoj` → `do të kisha punuar`)
- **AND** zero mismatches SHALL be reported for conditional perfect cells

#### Scenario: Indicative perfect still skips past-tagged Kaikki forms

- **WHEN** the script is invoked for `{ mood: 'indicative', tense: 'perfect', person: 1, number: 'singular' }` against the corpus verb `punoj`
- **THEN** the matched Kaikki form SHALL be `kam punuar` (tags `['indicative', 'perfect', ...]`)
- **AND** the script SHALL NOT match `kisha punuar` (tags `['indicative', 'past', 'perfect', ...]`) — that's the pluperfect

#### Scenario: Indicative pluperfect still matches past-tagged Kaikki forms

- **WHEN** the script is invoked for `{ mood: 'indicative', tense: 'pluperfect', person: 1, number: 'singular' }` against `punoj`
- **THEN** the matched Kaikki form SHALL be `kisha punuar` (tags include `past + perfect`)
