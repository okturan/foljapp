## ADDED Requirements

### Requirement: Verb page exposes IGT + CoNLL-U download

The verb page SHALL replace the v0.1.x disabled "Export IGT" placeholder with a working download control offering IGT (`.txt`) and CoNLL-U (`.conllu`) outputs. The other reserved-action placeholders (Practice, Playground, Frequency) remain in their current states pending their respective capabilities.

#### Scenario: Reserved actions row renders an enabled IGT export

- **WHEN** the user visits `/verb/punoj`
- **THEN** the reserved-actions row SHALL contain a non-disabled control labeled `Download` or `IGT export`
- **AND** clicking it SHALL surface IGT and CoNLL-U format options
