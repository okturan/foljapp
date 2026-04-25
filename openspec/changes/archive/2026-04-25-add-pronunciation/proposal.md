## Why

foljapp's reference, playground, and articles all show forms in Albanian orthography. A learner needs to know how to *say* them. Albanian's spelling-to-sound correspondence is near 1:1 — every letter (and a small set of digraphs) maps to a specific IPA character — so a rule-based transcription helper hits useful coverage without the corpus carrying per-verb IPA data.

This change adds that helper and surfaces IPA on verb pages. The helper is reusable elsewhere (articles, playground, public API) once it lands.

## What Changes

- Add `apps/web/lib/ipa.ts` exporting `toIpa(text)` that maps Albanian text to its IPA transcription. Uses a digraph-first tokenizer (so `dh`, `gj`, `ll`, `nj`, `rr`, `sh`, `th`, `xh`, `zh`, `ç` are recognized as units) followed by a per-token IPA lookup.
- Add Vitest coverage of the mapping for representative words (lemmas, suppletives, mutating-verb forms).
- Update `apps/web/components/verb-header.tsx` to render the lemma's IPA in slashes beneath the lemma. Also render IPA next to each principal part in the metadata `<dl>`.
- Update `/api/verbs/[lemma]?format=json` response to include `ipa: { lemma, principalParts }` on the entry. (Backwards-compatible additive change; OpenAPI doc updated.)

## Capabilities

### New Capabilities
- `pronunciation`: Defines the IPA transcription contract — input shape, mapping rules, edge-case coverage, and surfacing on verb pages.

### Modified Capabilities
- `reference-pages`: Adds requirement that the verb header surfaces IPA for the lemma and principal parts.

## Impact

- **Code** — `apps/web/lib/ipa.ts`, updates to `apps/web/components/verb-header.tsx`, possibly `apps/web/app/api/verbs/[lemma]/route.ts` for IPA-in-JSON.
- **Dependencies** — None.
- **APIs** — JSON response of `/api/verbs/[lemma]` gains an `ipa` field. Additive, non-breaking.
- **Linguistic claims** — Each phoneme mapping is sourced; documented in inline comments. Stress marking deferred to a follow-up (rule-based but with edge cases that benefit from review).
- **Audience tier** — All three. Learners benefit most directly.

## Non-Goals

- No stress marking in v1 (the diacritic ˈ; defer until Albanian stress rules are encoded with their exceptions).
- No audio playback / TTS.
- No dialectal IPA (Tosk only, per the rest of v0.1.x).
- No phonological allophone rules (we transcribe phonemically, not phonetically).
- No IPA on every cell of the conjugation table — too noisy. Reserved for the playground / API.

## Sequence

```
PREREQ → add-conjugation-engine             (forms to transcribe)
PREREQ → add-verb-reference-page            (page to mount on)
THIS   → add-pronunciation
NEXT   → add-stress-marking                  (rule-based with hand-flagged exceptions)
LATER  → add-tts-audio                        (if there's interest)
```
