# complete-mp-voice-arc

Close the MP voice arc by fixing MP optative present (final buildSimpleCell-ignores-voice bug — currently returns active form instead of u-prefixed) and adding an MP-coverage audit test that asserts every MP cell either produces a u-prefixed / jam-aux form or throws UnsupportedCellError, never silently returning an active form. Modifies conjugation-engine.
