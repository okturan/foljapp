# OPUS Fallback Examples

`examples.json` is a small tracked fallback bundle for the web app's parallel
examples UI. It is not the full local corpus, not the SQLite examples DB, and
not evidence for corpus-wide coverage.

The full downloaded corpora live under `.cache/datasets`, and the local examples
DB is generated at `.cache/corpus-local-full.sqlite`. See
`data/corpora/README.md` for the large-corpus inventory and scan workflow.

The app imports this fallback from `apps/web/lib/parallel-examples.ts` when a
requested form has no local runtime DB lookup available.
