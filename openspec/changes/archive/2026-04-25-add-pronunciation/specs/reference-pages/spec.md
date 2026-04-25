## ADDED Requirements

### Requirement: Verb header shows lemma IPA

The `/verb/[lemma]` page header SHALL render the lemma's IPA transcription in slashes beneath the lemma title, and SHALL render IPA inline next to each principal part.

#### Scenario: pjek page shows /pjɛk/ for the lemma and /pɔc/ for the aorist stem

- **WHEN** the user visits `/verb/pjek`
- **THEN** the rendered HTML SHALL contain `/pjɛk/` (the lemma IPA)
- **AND** SHALL contain `/pɔc/` (the aorist-stem `poq` mapped to IPA — note `q` → `c`)
