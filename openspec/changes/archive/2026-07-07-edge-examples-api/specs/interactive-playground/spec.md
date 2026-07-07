## MODIFIED Requirements

### Requirement: Corpus examples render without the live examples API

The playground's Examples panel SHALL source retained-corpus examples from
the prebuilt per-verb assets (`/examples/<verbId>.json`) in every
environment. The `/api/examples` route SHALL run on the Edge runtime,
SHALL always report `local.available: false`, and SHALL serve only target
derivation (`lookupForm`, `target`) plus OPUS parallel pairs; the panel's
fallback then loads the asset and composes retained rows first —
signature-restricted lookup before the key-wide fallback — followed by
parallel pairs, within the same total example cap. When the API is
entirely unreachable the panel SHALL fall back the same way.

#### Scenario: Playground shows attested examples for a suppletive verb

- **GIVEN** `jam` has retained corpus examples in `/examples/jam.json`
- **WHEN** the user selects a `jam` cell whose target key has retained
  examples
- **THEN** the Examples panel SHALL render those sentences with their
  corpus provenance (source name, and link when a URL was retained)
- **AND** the panel SHALL indicate that prebuilt examples are being shown

#### Scenario: Phonologically-mutating verb falls back by target key

- **GIVEN** the static asset for `djeg` contains rows for target key
  `digjet` under a different signature than the one requested
- **WHEN** signature-restricted lookup finds no rows
- **THEN** the panel SHALL fall back to all rows for the target key

#### Scenario: The examples route deploys to the Edge runtime

- **WHEN** the Cloudflare Pages artifact is built with next-on-pages
- **THEN** the build SHALL succeed with `/api/examples` configured for the
  Edge runtime
- **AND** the route SHALL respond without any Node.js-only APIs
