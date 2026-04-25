## Context

Albanian orthography is, by linguistic-typology standards, remarkably close to phonemic. A small mapping (≈ 30 entries) covers the entire alphabet plus the 10 digraphs and the special character `ç`. This makes a rule-based IPA transcription tractable without per-word data.

## Goals / Non-Goals

**Goals:**

- Pure function `toIpa(text)` that maps Albanian text to phonemic IPA.
- Coverage of every character / digraph in standard orthography.
- Surface IPA on the verb header (lemma + principal parts) and in the JSON API.

**Non-Goals:**

- No stress marking (`ˈ` insertion) — defer.
- No phonological allophonic detail (e.g., word-final devoicing if it occurs).
- No dialectal variants.
- No TTS / audio.

## Decisions

### D1. Digraph-first tokenizer

The function tokenizes the input by trying to match digraphs at each position before falling back to single characters. Digraphs are tried in a stable order (longest-first to avoid `s+h` collision; in practice all digraphs are 2 chars so order matters mainly for `r` vs `rr` and `l` vs `ll`).

```
input: "shoh"
tokens: ["sh", "o", "h"]
ipa:    "ʃɔh"
```

### D2. Phonemic, not phonetic

We transcribe at the phoneme level. `r` is `/ɾ/` (single tap) regardless of position; `rr` is `/r/` (trill). Word-final phonemes are not modified (no devoicing). This is the level of detail learners benefit from.

### D3. Slashes for IPA, italic font

In the UI, IPA is wrapped in slashes (`/punɔj/`) per phonological convention and rendered in a slightly italicized mono style.

### D4. Mapping table

| Letter / digraph | IPA  | Notes                                   |
| ---------------- | ---- | --------------------------------------- |
| a                | a    |                                         |
| b                | b    |                                         |
| c                | ts   |                                         |
| ç                | tʃ   |                                         |
| d                | d    |                                         |
| dh               | ð    |                                         |
| e                | ɛ    |                                         |
| ë                | ə    |                                         |
| f                | f    |                                         |
| g                | ɡ    |                                         |
| gj               | ɟ    |                                         |
| h                | h    |                                         |
| i                | i    |                                         |
| j                | j    |                                         |
| k                | k    |                                         |
| l                | l    |                                         |
| ll               | ɫ    | velarized                               |
| m                | m    |                                         |
| n                | n    |                                         |
| nj               | ɲ    |                                         |
| o                | ɔ    |                                         |
| p                | p    |                                         |
| q                | c    | palatal stop                            |
| r                | ɾ    | tap                                     |
| rr               | r    | trill                                   |
| s                | s    |                                         |
| sh               | ʃ    |                                         |
| t                | t    |                                         |
| th               | θ    |                                         |
| u                | u    |                                         |
| v                | v    |                                         |
| x                | dz   |                                         |
| xh               | dʒ   |                                         |
| y                | y    |                                         |
| z                | z    |                                         |
| zh               | ʒ    |                                         |

(Sources: Wikipedia Albanian phonology, Newmark/Hubbard, standard introductory grammars. Phonemic level only.)

## Tradeoffs

- **No stress marking.** Some consumers will want it. Mitigated by adding it later; the toIpa output is parseable as a string of phonemes that a stress-marker can consume.
- **No allophonic detail.** Linguists may prefer phonetic transcription. Mitigated: phonemic is the right level for learners; phonetic detail can be a `format=phonetic` option later.
- **No dialect.** Tosk only. Geg differs in some phonemes (e.g., nasalization, length). Deferred with `add-dialect-support`.

## Resolved Questions

_None._
