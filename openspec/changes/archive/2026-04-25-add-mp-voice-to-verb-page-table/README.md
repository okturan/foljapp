# add-mp-voice-to-verb-page-table

The conjugation table at /verb/[lemma] currently renders only .active cells (conjugation-table.tsx:78). After add-mp-admirative-coverage, the engine produces middle-passive forms for every supported mood/tense, but they are invisible to verb-page users — surfaces only via /playground or the JSON API. Extend the table to render MP rows beneath active rows where MP forms exist. Modifies reference-pages.
