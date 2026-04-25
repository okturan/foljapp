# add-husic-glossary-resolution

Extend Husić ingestion to cross-resolve the alphabetical glossary section against paradigm-model entries. Parses 'lemma → class-pattern-ref' pairs from the glossary, looks up the matched paradigm model, applies the model's paradigm to derive Husić-implied forms for the target verb. Lifts Husić coverage from 31/100 to potentially most of the corpus. Modifies conjugation-engine.
