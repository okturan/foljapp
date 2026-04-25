# fix-mp-imperative

Fix the pre-existing bug where buildImperative ignores voice and silently returns active forms for MP imperative cells. Make MP imperative throw UnsupportedCellError by default; add imperative.present.middle-passive cellOverrides for laj (lahu, lahuni) and shoh (shihu, shihuni) — the only corpus verbs where Kaikki carries MP imperative forms. Modifies conjugation-engine.
