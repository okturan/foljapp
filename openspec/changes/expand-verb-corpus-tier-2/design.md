## Context

Tier-1 ingestion was scoped to regular Class 1 -oj verbs because they're the largest and most-uniform sub-pattern in Albanian. Tier-2 must broaden coverage to:

- **Class 1, non--oj endings**: -aj (most regular), -ej (mostly irregular), -uaj (semi-regular), -yj / -yej (irregular).
- **Class 2 consonant-stem**: many regulars + a handful of mutating verbs.
- **Class 3 vowel-stem**: small group, with several irregulars (`fle`, `lë`, `di`).

Each of these sub-patterns adds ~10–25 verbs to the corpus. The script's `derivePrincipalParts` needs branches for each.

## Goals / Non-Goals

**Goals:**

- Corpus 50 → 100 verbs.
- Coverage by class: ~50% Class 1, ~30% Class 2, ~15% Class 3, ~5% irregular catch-all.
- 100% verify-engine match-rate maintained.
- Frequency tier annotations for every new verb.
- Bulk ingestion remains the primary workflow; hand-curation reserved for irregulars.

**Non-Goals:**

- No engine work; existing paradigm rules handle all 100 verbs (with cellOverrides for irregulars).
- No tier-3 expansion (100 → 200).
- No automatic Husić ingestion.
- No engine round-trip changes; existing build-corpus.ts gate suffices.

## Decisions

### D1. Class-specific principal-parts derivation rules

**Class 1 -oj** (already shipped in tier-1):

```
lemma:        X + oj          (kërkoj)
present stem: X + o           (kërko)
aorist stem:  X + ua          (kërkua)
participle:   X + uar         (kërkuar)
```

**Class 1 -aj** (regular, e.g., `paguaj`, `mbroj` — wait, `mbroj` is -oj):

Actually for `paguaj`:
```
lemma:        X + uaj         (paguaj)
present stem: X + ua          (pagua)
aorist stem:  X + ua          (pagua)         — same as present
participle:   X + uar          (paguar)
```

For `mbaj` (irregular -aj):
```
lemma:        mbaj
aorist:       mbajta (irregular!)
participle:   mbajtur
```

mbaj's aorist is irregular — needs cellOverride for the unique `-jt-` insertion. Same for `ndaj`, `paguaj` to lesser extent.

**Class 1 -ej** (e.g., `gjej`, `kthej`, `pëlqej`):

```
lemma:        gjej
present stem: gje
aorist:       gjeta (irregular!)
participle:   gjetur (irregular!)
```

Most -ej are irregular. Default scaffolding will produce TODO markers. Hand-curation expected.

**Class 1 -uaj** (e.g., `shkruaj`, `përshkruaj`):

```
lemma:        shkruaj
present stem: shkrua
aorist:       shkrova (irregular root change!)
participle:   shkruar (regular)
```

shkruaj has an irregular root change in aorist (`shkrua → shkrov`). cellOverride needed.

**Class 2 consonant-stem regular** (e.g., `prish`, `nis`, `vesh`, `ndal`, `ndez`, `përdor`):

```
lemma:        prish
present:      prish        (same as lemma)
aorist:       prish        (same as lemma)
participle:   prishur      (lemma + ur)
```

This is the simplest case. Auto-scaffold produces correct paradigms.

**Class 3 vowel-stem regular** (very few):

```
lemma:        di
present:      di
aorist:       di
participle:   ditur        (or `dirë` — varies)
```

Most Class 3 verbs are irregular. Auto-scaffold likely produces TODO markers.

### D2. Tier-2 manifest composition (target 50 verbs)

| Sub-batch | Pattern | Count | Examples |
|-----------|---------|-------|----------|
| 1a | Class 1 -oj (continuation) | 10 | bisedoj, organizoj, shërboj, mbledhoj, pushtoj, vendoj, lutom→`?, gjoj, nxitoj, gatuaj→class1-uaj |
| 1b | Class 1 -aj | 5 | mbaj (irregular), ndaj (irregular), paguaj (regular), kërcej (regular), gjuaj |
| 1c | Class 1 -ej | 5 | gjej (irregular), kthej (irregular), pëlqej (irregular), thej (irregular), grej |
| 1d | Class 1 -uaj/-yj | 5 | shkruaj (irregular), përshkruaj (irregular), thyej (irregular), kry, blej (-ej, irregular) |
| 2a | Class 2 regular | 10 | prish, nis, vesh, ndal, ndez, përdor, gris, mbledh (irregular), thirr (irregular), mbyll |
| 2b | Class 2 mutating + irregular | 5 | vjedh (irregular), pres (irregular), bie (irregular suppletive), shes (irregular -es), thuaj→class3? |
| 3a | Class 3 regular | 5 | di, kthye (no, kthye is class1), eci (regular), vete (irregular suppletive), shihem (MP only — skip) |
| 3b | Class 3 irregular | 5 | fle, lë, ngrij, arrij, mbas |

Total: 50. Expect ~15 of these to be irregular, requiring cellOverride curation.

The exact verb list resolves during ingestion task 4.1; some swaps are likely as Kaikki coverage and frequency rankings are checked.

### D3. Frequency-tier criteria (extends tier-1)

| Tier      | Criterion                                                          |
|-----------|--------------------------------------------------------------------|
| `core`    | Top-50 in Kote & Biba; appears in every textbook                  |
| `common`  | Top-50–200; appears in most textbooks                             |
| `uncommon`| 200–500; appears in ≥ 1 textbook                                  |
| `rare`    | Beyond 500; specialized vocabulary                                 |

Most tier-2 verbs land in `common` or `uncommon`. A few high-frequency ones (e.g., `bie`, `gjej`, `kthej`, `mbaj`, `shkruaj`) belong in `core` or upper `common`.

### D4. Irregularity-detection heuristic

After scaffolding, the script runs `verify-engine.ts --only-verb <id>` and parses the output. Mismatches trigger TODO marking:

```ts
function maybeFlagIrregular(verbId: string, draft: VerbEntryDraft): VerbEntryDraft {
  const verify = verifyOne(verbId);
  if (verify.ok) return draft;
  const cells = parseMismatchCells(verify.output);
  return {
    ...draft,
    notes: [
      `TODO: needs cellOverrides — verify-engine reported ${cells.length} mismatches.`,
      ...cells.slice(0, 5).map((c) => `  ${c.spec}: engine="${c.engine}" kaikki="${c.kaikki}"`),
    ].join('\n'),
  };
}
```

The notes field embeds enough context for a human curator to write the cellOverrides without re-running the script.

### D5. Class 1 -aj derivation branch

Implementation in `derivePrincipalParts`:

```ts
if (lemma.endsWith('uaj')) {
  // Class 1 -uaj (e.g., paguaj, gatuaj)
  const root = lemma.slice(0, -3); // "pagu"  → wait no, paguaj root is pa
  return { present: root + 'ua', aorist: root + 'ua', participle: root + 'uar' };
}
if (lemma.endsWith('aj') && !lemma.endsWith('uaj')) {
  // Class 1 -aj (e.g., mbaj, ndaj). Mostly irregular; default to regular pattern,
  // expect verify-engine to flag for review.
  const root = lemma.slice(0, -2);
  return { present: root + 'a', aorist: root + 'a', participle: root + 'ar' };
}
if (lemma.endsWith('ej')) {
  // Class 1 -ej. Most irregular; defer to TODO.
  throw new Error(`derivePrincipalParts: -ej verbs are usually irregular; flag as irregular: true in manifest`);
}
```

The strict "throw on -ej" forces manifest authors to acknowledge -ej verbs need hand-crafting.

### D6. Class 2 derivation branch

```ts
if (entry.class === 2) {
  return {
    present: lemma,
    aorist: lemma,
    participle: lemma + 'ur',
  };
}
```

Simple. Mutating verbs (k → q etc.) can have their mutation either in a custom aorist stem (cellOverride) or as a paradigm-level rule (already exists for some patterns). The default `aorist === lemma` is correct for non-mutating verbs.

### D7. Class 3 derivation branch

```ts
if (entry.class === 3) {
  // Most Class 3 verbs are irregular. Default scaffolding picks the most
  // common participle pattern (lemma + "rë") but expects verify-engine
  // to flag mismatches.
  return {
    present: lemma,
    aorist: lemma,
    participle: lemma + 'rë',
  };
}
```

### D8. Verification workflow

```
1. Author manifest                          (manual)
2. Run ingest-kaikki-batch.ts               (automated)
3. Inspect output: ready / needs-review     (manual)
4. For each needs-review verb:
   a. Read TODO notes in JSON               (manual)
   b. Reference Kaikki page for forms       (manual)
   c. Add cellOverrides                     (manual)
   d. Re-run verify-engine --only-verb <id> (manual)
   e. Iterate                               (manual)
5. Update frequency.json                    (manual)
6. Run full verify-engine                   (automated)
7. Update sources.md                        (manual)
```

### D9. No engine paradigm changes

If the ingestion surfaces a Kaikki form pattern the engine doesn't produce, that's an engine bug worth fixing in a separate change. Tier-2 itself does NOT include engine fixes; it stays scoped to corpus expansion.

## Tradeoffs

- **Curation cost.** ~15 of the 50 new verbs likely need manual cellOverride work. Estimate ~10 min per irregular = 2.5 hours of focused review.
- **Frequency rankings vary across corpora.** Tier assignments are subjective. Mitigated by citing Kote & Biba where possible; documenting in `notes` field.
- **Class 3 paradigm is thin.** With only ~10 verbs of class 3 in the corpus, the engine's class-3 paradigm rules get a fairly small test surface. Acceptable: any engine bug surfaces as a verify-engine mismatch and triggers a separate engine fix.
- **The `irregular: true` flag is a manual escape hatch.** Manifest authors must label Kaikki-irregular verbs explicitly. Mitigated by the script's strict "throw on -ej" behavior, which forces label-or-fail.
- **TODO markers create temporary noise in the corpus.** The notes field documents the irregularity inline, but a TODO-marked corpus entry shouldn't ship to production without human review. Mitigated by build-corpus.ts schema validation (entries with malformed cellOverrides fail fast).

## Resolved Questions

_None._

## Open Questions

- **Q1.** Should we ship a small-batch validation tool (e.g., `verify-corpus-batch tier-2`) that re-runs verify-engine on only the new verbs to speed iteration? Recommend: yes if curation takes more than one session; otherwise existing `--only-verb` suffices.
- **Q2.** How do we handle MP-only verbs (`përgjigjem`, `lutem`, `shihem`)? They're attested but the engine assumes active is the lemma. Defer to a `mp-only-verbs` change; tier-2 skips MP-only lemmas.
- **Q3.** Some Albanian verbs have multiple frequency rankings depending on whether reflexive or active sense is counted. Recommend: pick the active-sense ranking unless the verb is MP-only.
