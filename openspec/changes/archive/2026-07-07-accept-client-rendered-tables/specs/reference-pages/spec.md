## MODIFIED Requirements

### Requirement: Server-side rendering only — no JS required for content

The verb page SHALL statically pre-render its shell: header (lemma,
translation, IPA, class/auxiliary badges, principal parts), page metadata,
and the citations footer. The conjugation tables and decomposition markup
are client-rendered from the bundled corpus (a deliberate artifact-size
tradeoff: prerendering all verb tables produced a 153 MB Pages artifact vs
9.8 MB without; ratified 2026-07-07). The static HTML SHALL contain a
loading placeholder where the tables mount, and client-side rendering
SHALL require no additional network fetches beyond the deployed bundle.

#### Scenario: Shell content is intact with JavaScript disabled

- **WHEN** an automated test fetches `/verb/punoj` over HTTP and parses the
  HTML response without executing any JavaScript
- **THEN** the parsed DOM SHALL contain the lemma header, principal parts,
  and the citations footer with engine and corpus versions
- **AND** the parsed DOM SHALL contain the tables' loading placeholder

#### Scenario: Tables render fully with JavaScript enabled

- **WHEN** the page is loaded in a browser with JavaScript enabled
- **THEN** the conjugation tables SHALL render with at least 100 distinct
  conjugated forms across all moods
- **AND** decomposition segments SHALL carry their title attributes (the
  keyboard-focus E2E covers this)
