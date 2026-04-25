## Context

Citations exist scattered across the app. This change consolidates them on a `/references` page and adds a Cite button on verb pages.

## Goals / Non-Goals

**Goals:**

- Single page listing every authoritative source.
- BibTeX blocks (the academic standard).
- Per-verb cite action emitting a `@misc` entry.
- Per-engine cite action emitting a `@software` entry with version metadata.

**Non-Goals:**

- No MLA / Chicago / RIS in v1.
- No CrossRef registration.
- No CSL JSON.
- No clipboard auto-copy on click (manual select-and-copy is fine).

## Decisions

### D1. Bibliography is hand-authored TypeScript data

`apps/web/lib/bibliography.ts` exports an array of typed source records. Hand-authored, ~10 entries. Future additions are PRs to that file.

### D2. BibTeX emission as pure functions

`bibtexForSource(s)` / `bibtexForVerb(entry, url)` / `bibtexForEngine(v1, v2)` are pure string-building functions. Tests assert exact output for representative inputs.

### D3. Cite button uses the same dropdown pattern as Download

`<CiteButton>` opens a popover with three formats. Each is a `<pre>` the user can manually select. No automatic clipboard copy in v1 (browser permissions vary).

### D4. Engine + corpus versions in @software BibTeX

The `Cite foljapp` block on `/references` reads `engineVersion` from `@foljapp/engine` and `corpusVersion` from the corpus, and emits a `@software` entry with `version = "engine-X.Y.Z corpus-X.Y.Z"`.

## Tradeoffs

- **Hand-authored bibliography** drifts from reality if sources change. Mitigated by being a small file in the repo — review on PR.
- **No clipboard auto-copy** is friction. Acceptable for v1; many users actually prefer "select what I want" over clipboard surprise.

## Resolved Questions

_None._
