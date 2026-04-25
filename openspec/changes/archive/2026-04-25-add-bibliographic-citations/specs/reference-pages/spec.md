## ADDED Requirements

### Requirement: Verb page exposes a Cite action

Every `/verb/[lemma]` page SHALL render a Cite control adjacent to the existing reserved-actions row (Download, Practice). Activating the control SHALL surface BibTeX, APA, and plain-text citations for the verb's foljapp URL. The action SHALL be enabled (not a placeholder).

#### Scenario: Cite control opens a citation popover

- **WHEN** the user clicks the Cite control on `/verb/punoj`
- **THEN** the page SHALL surface citation strings including the verb's lemma, translation, and the foljapp URL pattern `/verb/punoj`
