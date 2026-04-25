# add-mp-admirative-coverage

Implement middle-passive admirative across all four tenses (present, imperfect, perfect, pluperfect) and fix the pre-existing bug where buildSimpleCell ignores the voice argument and silently returns active forms for MP admirative present. Surface-form ground truth: Kaikki — for verbs whose MP admirative present/imperfect 1sg/2sg/1pl/2pl are marked nonexistent (u —), the engine SHALL throw UnsupportedCellError; otherwise produce the form. Modifies conjugation-engine.
