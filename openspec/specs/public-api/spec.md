# public-api Specification

## Purpose
TBD - created by archiving change add-public-api. Update Purpose after archive.
## Requirements
### Requirement: GET /api/verbs lists the corpus

`GET /api/verbs` SHALL return HTTP 200 with `Content-Type: application/json` and a body of shape:

```
{
  "engineVersion": "0.1.0",
  "corpusVersion": "0.1.0",
  "verbs": [
    { "id": "...", "lemma": "...", "translationEn": "...", "class": 1|2|3, "auxiliary": "kam"|"jam" },
    ...
  ]
}
```

The array SHALL contain one entry per verb in the corpus, sorted by `id` ascending.

#### Scenario: List endpoint returns 20 verbs

- **WHEN** the user requests `GET /api/verbs`
- **THEN** the response status SHALL be 200
- **AND** `body.verbs.length` SHALL be ≥ 20
- **AND** every entry SHALL have all five fields defined

### Requirement: GET /api/verbs/[lemma] returns the full conjugation table

`GET /api/verbs/<lemma>` SHALL return the verb's full table. Response shape depends on `?format=...`:

- `format=json` (default) — JSON containing engine version, corpus version, the verb entry, and the full table object from `engine.table()`.
- `format=igt` — `text/plain` IGT-formatted file (same as the IGT download).
- `format=conllu` — `text/plain` CoNLL-U-formatted file.

Unknown lemmas SHALL return HTTP 404 with a JSON body `{ "error": "unknown verb", "lemma": "..." }` regardless of format.

#### Scenario: JSON format returns the full table

- **WHEN** the user requests `GET /api/verbs/punoj` (or `?format=json`)
- **THEN** the response status SHALL be 200
- **AND** `body.entry.lemma` SHALL equal `"punoj"`
- **AND** `body.table.indicative.present["1sg.active"].form` SHALL equal `"punoj"`

#### Scenario: IGT format returns plain text

- **WHEN** the user requests `GET /api/verbs/punoj?format=igt`
- **THEN** the response `Content-Type` SHALL begin with `text/plain`
- **AND** the response body SHALL contain `verb: punoj` in its header

#### Scenario: CoNLL-U format returns CoNLL-U text

- **WHEN** the user requests `GET /api/verbs/punoj?format=conllu`
- **THEN** the response `Content-Type` SHALL begin with `text/plain`
- **AND** the response body SHALL contain `# sent_id = punoj`
- **AND** the response body SHALL contain `Mood=Ind` somewhere

#### Scenario: Unknown lemma returns 404

- **WHEN** the user requests `GET /api/verbs/notarealverb`
- **THEN** the response status SHALL be 404
- **AND** the response body SHALL be JSON containing `error` and `lemma`

### Requirement: GET /api/openapi.json describes the API

`GET /api/openapi.json` SHALL return an OpenAPI 3.1 JSON document describing the `/api/verbs` and `/api/verbs/{lemma}` endpoints. The document SHALL include component schemas for `CorpusIndexEntry`, `VerbEntry`, `ConjugationTableResponse`, and `ErrorResponse`.

#### Scenario: OpenAPI document is valid JSON

- **WHEN** the user requests `GET /api/openapi.json`
- **THEN** the response status SHALL be 200
- **AND** the response body SHALL be parseable JSON
- **AND** `body.openapi` SHALL match `^3\.1\.`
- **AND** `body.paths["/api/verbs"]` SHALL be defined
- **AND** `body.paths["/api/verbs/{lemma}"]` SHALL be defined

### Requirement: All endpoints are statically pre-rendered

Every API route SHALL declare `export const dynamic = 'force-static'` (and `generateStaticParams` for `[lemma]`) so the build emits cached JSON/text responses. No runtime computation per request.

#### Scenario: Build emits a static file for /api/verbs

- **WHEN** the developer runs `npm run build`
- **THEN** the build output SHALL list `/api/verbs` as a static (`○`) route

