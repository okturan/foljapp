## ADDED Requirements

### Requirement: Impersonal middle-passive verbs use the third-person flag

Verbs whose middle-passive SHALL be restricted to impersonal (third-person)
use — per FGJSH *vetv.* marking and corpus attestation — carry
`flags.middlePassiveThirdPersonOnly` rather than `noMiddlePassive`. `iki`,
`gjezdis`, and `qendroj` SHALL conjugate third-person middle-passive cells
(*iket*, *gjezdiset*, *qëndrohet*) and SHALL refuse first/second-person
middle-passive cells with `UnsupportedCellError`.

#### Scenario: iket conjugates, ikem refuses

- **WHEN** the indicative present middle-passive 3sg of `iki` is conjugated
- **THEN** the surface SHALL be `iket`
- **AND** the same cell with person 1 SHALL throw `UnsupportedCellError`

#### Scenario: qëndrohet resolves the Husić conflict

- **WHEN** the indicative present middle-passive 3sg of `qendroj` is
  conjugated
- **THEN** the surface SHALL be `qëndrohet`, matching the Husić cache row

#### Scenario: suppletive and mutating full-MP verbs are unaffected

- **GIVEN** the suppletive verb `them` and the phonologically-mutating verb
  `djeg`
- **WHEN** their first-person middle-passive present cells are conjugated
- **THEN** they SHALL conjugate normally (`thuhem`, `digjem`) — the
  restriction applies only to flagged verbs

### Requirement: Verification treats voice-flag refusals as decisions

`scripts/verify-engine.ts` SHALL count a cell as a match when the engine
refuses it due to an editorial voice flag (`noMiddlePassive`, or
`middlePassiveThirdPersonOnly` on a non-third-person middle-passive cell),
regardless of mechanically-generated source-cache rows, and SHALL report
the number of such flag-suppressed cells (and how many carried source
data) so the conflicts stay visible.

#### Scenario: Flagged verb with Husić rows verifies clean

- **GIVEN** a verb flagged `middlePassiveThirdPersonOnly` whose Husić cache
  carries first-person middle-passive rows
- **WHEN** verify-engine probes those cells
- **THEN** they SHALL count as flag-suppressed matches, not mismatches
- **AND** the summary SHALL report the flag-suppressed total
