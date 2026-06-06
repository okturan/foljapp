## ADDED Requirements

### Requirement: Playground supports every corpus verb

The `/playground` page SHALL accept any lemma present in the foljapp corpus index (`data/verbs/index.json`). Submitting a corpus lemma to the verb input SHALL produce a conjugation result, NOT an "Unknown verb" error.

The client-side engine SHALL be configured at module load with the full corpus — every verb entry validated by `scripts/build-corpus.ts` SHALL be reachable from the browser bundle.

#### Scenario: Any corpus lemma resolves in the playground

- **GIVEN** a corpus lemma (e.g., `dhemb`, `kërkoj`, `qëndroj`, `tregoj`) that has a `.json` file under `data/verbs/`
- **WHEN** the user navigates to `/playground?verb=<lemma>&mood=indicative&tense=present&voice=active&person=1&number=singular&polarity=affirmative&modality=declarative`
- **THEN** the result panel SHALL render a conjugated form (NOT an "Unknown verb" / "No corpus entry found" error)

#### Scenario: Verb-page lemma list and playground lemma list match

- **GIVEN** the corpus index `data/verbs/index.json` lists 204 lemmas
- **WHEN** the playground configures its client-side engine on first load
- **THEN** the engine's `listVerbs()` SHALL return 204 entries
- **AND** for every lemma `L` rendered as a static `/verb/<L>` page, `/playground?verb=<L>` SHALL conjugate `L` without throwing `UnknownVerbError`
