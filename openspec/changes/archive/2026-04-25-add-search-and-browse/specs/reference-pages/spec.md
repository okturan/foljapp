## ADDED Requirements

### Requirement: Cell anchor IDs

Every conjugated form on `/verb/[lemma]` SHALL be reachable via a fragment identifier `#<mood>-<tense>-<person><number>` (e.g., `#indicative-aorist-1sg`). The id SHALL be on the cell's `<td>` element. Non-finite forms SHALL use `#non-finite-<form>` (e.g., `#non-finite-gerund`). Imperative cells SHALL use `#imperative-present-2sg` and `#imperative-present-2pl` only.

#### Scenario: Indicative aorist 1sg is deep-linkable

- **WHEN** the user requests `/verb/punoj` and inspects the rendered HTML
- **THEN** the page SHALL contain an element with `id="indicative-aorist-1sg"`
- **AND** that element SHALL contain the form `punova`

#### Scenario: Non-finite gerund is deep-linkable

- **WHEN** the user requests `/verb/punoj` and inspects the rendered HTML
- **THEN** the page SHALL contain an element with `id="non-finite-gerund"`
- **AND** that element SHALL contain the form `duke punuar`
