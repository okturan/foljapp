# refine-verify-engine-tagging

Refine verify-engine tag mapping for moods Kaikki tags non-canonically: conditional present is tagged 'imperfect' (because the construction uses imperfect form under do të); conditional perfect is tagged 'past + perfect' (same shape as pluperfect). Fix tagsFor accordingly. Refactor the past-disambiguation filter to be mood-agnostic (auto-skip Kaikki forms with 'past' when we're not looking for 'past'). Modifies conjugation-engine.
