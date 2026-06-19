# foljapp

foljapp is a working reference for Albanian verbs.

It gives learners, teachers, and builders one place to search a verb, inspect full paradigms, read grammar notes, practice forms, and call the same engine through JSON routes.

## Current Status

foljapp is an early build, but the main reference loop is already in place.

1. Search or browse the verb list.
2. Open a verb page with principal parts, full tables, IPA, English glosses, citations, and export formats.
3. Try any supported mood, tense, voice, person, number, polarity, and modality in the playground.
4. Practice conjugation through short quiz sessions.
5. Read grammar articles on verb classes and the admirative mood.
6. Use public routes for verb lists, verb detail, OpenAPI, IGT, and CoNLL U output.

## What It Covers

The engine models Standard Albanian verb morphology across the major finite moods.

1. Indicative
2. Subjunctive
3. Conditional
4. Admirative
5. Optative
6. Imperative
7. Non finite forms

It also handles active and middle passive voice, affirmative and negative forms, declarative and interrogative modality, suppletive verbs, irregular cells, decomposition segments, and source backed exceptions.

## App Routes

```txt
/                 search
/browse           verb browser
/verb/punoj       reference page
/playground       live conjugator
/practice         practice start
/practice/quiz    quiz session
/articles         grammar notes
/references       source list
/random           redirect to one verb
```

## API Routes

The API is read only and returns the same data used by the web app.

```txt
/api/verbs
/api/verbs/punoj
/api/verbs/punoj?format=igt
/api/verbs/punoj?format=conllu
/api/openapi.json
```

The verb detail route returns the entry, generated table, English glosses, IPA for the principal parts, version metadata, and a citation string.

## Engine Package

The morphology engine lives in `packages/engine`. It is deterministic and typed, so the app, tests, and API all share the same conjugation rules.

```ts
import { conjugate, table } from '@foljapp/engine';

const result = conjugate('punoj', {
  mood: 'indicative',
  tense: 'present',
  voice: 'active',
  person: 1,
  number: 'singular',
});

console.log(result.form);

const fullTable = table('punoj');
```

Useful exports include `conjugate`, `table`, `trace`, `allCells`, `listVerbs`, `participle`, and typed errors for unknown verbs, invalid options, unsupported cells, and data integrity issues.

## Project Layout

```txt
apps/web             Next.js app, pages, API routes, UI
packages/engine      TypeScript conjugation engine
packages/data        shared data schema checks
data/verbs           checked in verb entries
data/sources         source manifests
scripts              build and audit utilities
```

## Local Setup

Use Node 22 or newer.

```sh
nvm use
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

## Quality Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## License

MIT
