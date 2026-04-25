## ADDED Requirements

### Requirement: Every form segment is tooltip-explorable

Every conjugated form rendered on `/verb/[lemma]` SHALL surface a learner-readable explanation per segment via the `title` attribute (no JS required) and additionally via a hover/focus tooltip when JavaScript is available.

#### Scenario: A compound perfect form is fully explored on hover

- **WHEN** the user hovers each segment of `kam punuar` on `/verb/punoj`
- **THEN** the user SHALL see explanations for `kam` (auxiliary), `punu` (verb stem), and `ar` (Class 1 participle ending)
