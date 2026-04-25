# add-husic-verification-source

Ingest Husić's Albanian Verb Dictionary and Manual (KU Libraries 2002, our priority-1 logic source) as a second verification source alongside Kaikki. Architecture: parse a digital copy of Husić into JSONL with form+tags shape (same as Kaikki), cache at .cache/husic/<id>.jsonl, extend verify-engine to consult Husić as fallback when Kaikki has no entry. Verifies the 740 cells our engine produces (future-perfect, future-in-past, past-anterior etc.) that Kaikki's tables don't enumerate. Modifies conjugation-engine.
