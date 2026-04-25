## ADDED Requirements

### Requirement: Practice link enabled in reserved-actions

The verb page's reserved-actions row SHALL replace the disabled "Practice" placeholder with an enabled anchor pointing to `/practice/quiz?focus=<lemma>`. The Frequency placeholder remains disabled pending its capability.

#### Scenario: Practice link routes to the verb-scoped quiz

- **WHEN** the user clicks the Practice button on `/verb/punoj`
- **THEN** the browser SHALL navigate to `/practice/quiz?focus=punoj`
