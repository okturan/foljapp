## Context

The decomposition data the engine emits is already structured enough to express as Leipzig glossing or CoNLL-U; we just need formatters. This change is mostly text-formatting code and a small UI affordance.

## Goals / Non-Goals

**Goals:**

- Two text formats: Leipzig IGT (3-line aligned) and CoNLL-U (one row per cell).
- Client-side blob download — no server endpoints.
- Pure functions over `engine.table()` output.
- No new linguistic claims.

**Non-Goals:**

- HTTP API surfacing the exports (that's `add-public-api`).
- LaTeX / PDF rendering.
- Configurable feature subsets in CoNLL-U FEATS.

## Decisions

### D1. Gloss-tag mapping is a small lookup table

Each role + meta tuple maps to a Leipzig-Glossing-Rules-style tag:

```
particle (të)       → SBJV
particle (do)       → FUT
particle (mos)      → NEG
particle (nuk)      → NEG
particle (a)        → INT
particle (duke)     → GERUND
particle (pa)       → PRIV
auxiliary           → AUX
stem                → STEM
ending (with meta)  → <PERSON><NUMBER>.<TENSE> (e.g., 1SG.PRS)
voice-marker (u)    → MID.PASS
```

Lives in `apps/web/lib/igt.ts` next to the formatter.

### D2. Three-line vs four-line block

Leipzig conventions show two-line (Surface + Gloss). Many practitioners add a free-translation line. We add a fourth header line with the cell coordinates so each block is self-describing in a multi-block file. Format:

```
# indicative perfect 1sg
kam   punu   -ar
AUX   STEM   1SG.PRS
"I have worked"
```

### D3. CoNLL-U FEATS use UD universal features

Mapping from our enum values to UD:

| our value          | UD FEATS                                                    |
|--------------------|-------------------------------------------------------------|
| mood: indicative   | Mood=Ind                                                    |
| mood: subjunctive  | Mood=Sub                                                    |
| mood: conditional  | Mood=Cnd                                                    |
| mood: admirative   | Mood=Adm                                                    |
| mood: optative     | Mood=Opt                                                    |
| mood: imperative   | Mood=Imp                                                    |
| tense: present     | Tense=Pres                                                  |
| tense: imperfect   | Tense=Imp                                                   |
| tense: aorist      | Tense=Past (Aspect=Perf)                                    |
| tense: perfect     | Tense=Pres (Aspect=Perf)                                    |
| voice: active      | Voice=Act                                                   |
| voice: middle-passive | Voice=Mid                                                |
| polarity: negative | Polarity=Neg                                                |
| modality: interrogative | (not a UD feature; emitted as `Interrogative=Yes`)     |

These are not perfect 1:1 with UD's official guidelines (Albanian's UD treebank has its own variants) but they are close enough to be readable by UD-aware tools.

### D4. Client-side blob download

Use `URL.createObjectURL(new Blob([content], { type: 'text/plain' }))` with an anchor `download="<lemma>.txt"`. No server endpoint needed.

## Tradeoffs

- **CoNLL-U FEATS values** approximate UD; researchers may want to adjust. Acceptable: file format is stable; FEATS values are documented in the export header.
- **No header preamble** in CoNLL-U beyond `# sent_id`. Standard.

## Resolved Questions

_None._
