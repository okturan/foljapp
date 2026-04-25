# practice-mode Specification

## Purpose
TBD - created by archiving change add-practice-mode. Update Purpose after archive.
## Requirements
### Requirement: /practice landing page

`/practice` SHALL be a Server Component rendering a description of the quiz, an explanation of the modes available, and a primary "Start a session" button linking to `/practice/quiz`. The page SHALL be statically pre-rendered.

#### Scenario: Landing page renders the start button

- **WHEN** the user requests `GET /practice`
- **THEN** the response SHALL be HTTP 200
- **AND** the rendered HTML SHALL contain a link or button labeled `Start a session` with `href="/practice/quiz"`

### Requirement: Quiz session lifecycle

`/practice/quiz` SHALL run a session of 10 questions. Each question presents a prompt, accepts a text answer, scores via `engine.conjugate(verbId, options).form === userInput`, and advances to the next question. After the last question, the page SHALL render a summary with the final score and a "Try again" button.

#### Scenario: Submitting the canonical form scores as correct

- **WHEN** the user views a question prompting `Conjugate punoj (to work) in indicative present 1sg`
- **AND** types `punoj` and submits
- **THEN** the page SHALL render a "correct" indicator
- **AND** advance to the next question (or to the summary if it's the last one)

#### Scenario: Submitting an incorrect form reveals the answer

- **WHEN** the user submits the wrong form
- **THEN** the page SHALL show the user's answer marked "incorrect"
- **AND** display the canonical form from the engine
- **AND** allow the user to advance to the next question

#### Scenario: Session ends with a score summary

- **WHEN** the user has answered (or skipped) 10 questions
- **THEN** the page SHALL render a summary including `Score: <correct>/<total>` and a "Try again" affordance

### Requirement: Question generation

The function `generateQuestions(seed?: number, count?: number)` SHALL produce a deterministic-when-seeded array of `Question` records. Each question SHALL:

- Reference a real corpus verb
- Specify a cell that `engine.conjugate(verbId, options)` returns without throwing
- Include the canonical form as `expectedForm` for scoring

For v1, every generated question SHALL use `voice: "active"`, `polarity: "affirmative"`, `modality: "declarative"`. Imperative cells SHALL only ever request `person: 2`.

#### Scenario: Seeded generation is deterministic

- **WHEN** `generateQuestions(42)` is invoked twice
- **THEN** both calls SHALL return arrays whose `verbId`, `options`, and `expectedForm` are deeply equal at every index

#### Scenario: Generated questions all conjugate cleanly

- **WHEN** `generateQuestions()` produces a question
- **THEN** invoking `engine.conjugate(question.verbId, question.options)` SHALL succeed (not throw)
- **AND** the returned form SHALL equal `question.expectedForm`

### Requirement: Focus scoping via URL

`/practice/quiz?focus=<lemma>` SHALL restrict question generation to the named verb's cells. If `focus` references an unknown lemma, the quiz SHALL fall back to the default unfocused mode.

#### Scenario: focus=punoj restricts questions to punoj

- **WHEN** the user visits `/practice/quiz?focus=punoj`
- **THEN** every generated question SHALL have `verbId === "punoj"`

### Requirement: Reserved-actions enables Practice link

The verb-page reserved-actions row SHALL replace the disabled "Practice" placeholder with an enabled link to `/practice/quiz?focus=<lemma>`.

#### Scenario: Practice link is enabled and routes correctly

- **WHEN** the user visits `/verb/punoj`
- **THEN** the reserved-actions row SHALL contain a non-disabled link with `href` matching `/practice/quiz?focus=punoj`

