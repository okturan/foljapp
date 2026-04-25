# add-engine-trace

Phase 3.4 — Expose how each form is constructed. New engine.trace(verbId, options) returns an ordered TraceStep[] describing corpus lookup, stem selection, paradigm application, compound-tense composition, phonology, and particle prepending. Used by a new <DerivationPanel> on the playground (and optionally the verb page) to surface the construction recipe.
