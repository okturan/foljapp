## 1. Pre-flight

- [x] 1.1 Read proposal.md, design.md, and both spec files; confirm scope is unchanged

## 2. IGT and CoNLL-U formatters

- [x] 2.1 Create `apps/web/lib/igt.ts` with `formatIgt(verbId, options)`, `formatIgtTable(verbId)`, `formatConllu(verbId)`
- [x] 2.2 Implement gloss-tag mapping per design D1 (particle names, AUX, STEM, PERSON.NUMBER.TENSE for endings)
- [x] 2.3 Implement UD FEATS mapping per design D3 (Mood / Tense / Aspect / Person / Number / Voice / Polarity)
- [x] 2.4 Add Vitest coverage: compound perfect, subjunctive, suppletive jam, mutating pjek, full-table headers, CoNLL-U cell coverage, FEATS values

## 3. Download UI

- [x] 3.1 Create `apps/web/components/download-actions.tsx` (Client Component) with a button that opens a dropdown offering IGT and CoNLL-U downloads
- [x] 3.2 Trigger downloads via `URL.createObjectURL(new Blob([...]))` + an anchor with `download` attribute
- [x] 3.3 Filenames: `<lemma>.txt` for IGT, `<lemma>.conllu` for CoNLL-U
- [x] 3.4 Imports `apps/web/lib/corpus-client.ts` so the engine has the corpus configured in the browser

## 4. Reserved-actions integration

- [x] 4.1 Update `apps/web/components/reserved-actions.tsx` to mount `<DownloadActions>` and remove the "Export IGT" disabled placeholder
- [x] 4.2 Update `apps/web/app/verb/[lemma]/page.tsx` to pass `verbId` and `lemma` to `<ReservedActions>`

## 5. End-to-end tests

- [x] 5.1 Add `apps/web/e2e/igt-export.spec.ts` — Download button present + enabled, menu opens, IGT download produces `punoj.txt` with header content, CoNLL-U download produces `punoj.conllu`
- [x] 5.2 Update existing verb-page test that expected "Export IGT" to be disabled — Download is now enabled

## 6. Validation and handoff

- [x] 6.1 Run all root scripts (`typecheck`, `lint`, `test`, `build`, `test:e2e`) — all green (81 unit + 39 E2E pass)
- [x] 6.2 Update specs if implementation surfaced clarifications — none required
- [x] 6.3 `openspec validate add-igt-export --strict` — zero errors
