## Why

Researchers reading foljapp need to take its data into their own pipelines. The reference page is human-readable; an export is machine-readable. This change adds two complementary export formats, both derived deterministically from the engine's role-tagged decomposition:

- **Leipzig-style interlinear glossing (IGT)** — three-line text:
  ```
  punoj
  Surface     kam   punu  -ar
  Gloss       AUX   STEM   PCP
  English     I have worked
  ```
  Standard for typological linguistics.

- **CoNLL-U** — one row per token-form, with morphological feature columns. The format Universal Dependencies uses; our UD-Albanian-TSA citations point researchers to it.

Both are pure functions of the engine's `table()` output. No new linguistic claims; just reformatting.

## What Changes

- Add `apps/web/lib/igt.ts` exporting:
  - `formatIgt(verbId, options): string` — renders one cell as a 3-line IGT block.
  - `formatIgtTable(verbId): string` — renders the entire verb table as a sequence of IGT blocks.
  - `formatConllu(verbId): string` — emits a CoNLL-U file for the verb's full table.
- Add a "Download" control on `/verb/[lemma]` (replacing or supplementing the disabled `Export IGT` reserved-actions button) with two options:
  - "Download as IGT (.txt)"
  - "Download as CoNLL-U (.conllu)"
  Both trigger a client-side blob download; no server roundtrip.
- Add Vitest coverage of the IGT formatter for representative cells (compound perfect, subjunctive, suppletive, mutating).

## Capabilities

### New Capabilities
- `igt-export`: Defines the IGT and CoNLL-U formats, the download button contract, and the requirement that exports be derivable purely from `engine.table()` output.

### Modified Capabilities
- `reference-pages`: Updates the reserved-actions row to enable the Export-IGT button (was disabled).

## Impact

- **Code** — `apps/web/lib/igt.ts`, `apps/web/components/download-actions.tsx`, updates to `apps/web/app/verb/[lemma]/page.tsx` to mount the new component.
- **Dependencies** — None.
- **APIs** — None (yet; HTTP API is `add-public-api`).
- **Linguistic claims** — None (exports are pure transforms).
- **Audience tier** — **Researchers** primarily; **students** secondarily.

## Non-Goals

- No HTTP endpoint for downloads; this is client-side only.
- No PDF / LaTeX export.
- No bulk-corpus export (whole-corpus dump is a separate change).
- No customization of which features get included in the CoNLL-U FEATS column.

## Sequence

```
PREREQ → add-conjugation-engine               (provides decomposition + meta)
PREREQ → add-verb-reference-page              (provides the page where the button lives)
THIS   → add-igt-export
NEXT   → add-public-api                        (HTTP endpoints serving the same exports)
```
