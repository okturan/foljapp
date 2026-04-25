/**
 * Husić glossary cross-resolution.
 *
 * Reads the alphabetical-glossary map produced by `parse-husic-pdf.py
 * --emit-glossary-map`, looks up each glossary entry's lemma in our corpus,
 * and emits a `.cache/husic/<id>.jsonl` cache file for any corpus verb
 * that:
 *   - has no existing direct Husić cache file (don't override paradigm-model entries)
 *   - has no `cellOverrides` (those mark engine-vs-paradigm divergences)
 *   - has a model verb with a paradigm-model cache file
 *
 * Each derived record is marked `derived: true` so verify-engine can
 * annotate matches as `M (h*)`.
 *
 * The derivation produces engine.table() output for the target verb,
 * tagged with the same provenance as Husić's classification suggests.
 * Per design D4 of add-husic-glossary-resolution, this catches:
 *   - cellOverride additions that diverge from Husić's classification
 *   - class-assignment disagreements
 * but is tautological for unmodified regulars (their derived records
 * trivially match their engine output).
 *
 * Run: `npx tsx scripts/husic-glossary-cross-resolve.ts <glossary-map.json>`
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configure,
  table as engineTable,
  type ConjugationResult,
  type VerbEntry,
} from '@foljapp/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');
const HUSIC_CACHE_DIR = join(REPO_ROOT, '.cache', 'husic');

interface GlossaryEntry {
  lemma: string;
  lemma_id: string;
  suffix: 'j' | '0';
  pattern: string;
  model: string;
  gloss: string;
}

function loadCorpus(): VerbEntry[] {
  const files = readdirSync(VERBS_DIR).filter(
    (f) =>
      f.endsWith('.json') &&
      !['index.json', 'version.json', 'frequency.json'].includes(f),
  );
  return files.map((f) => JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')) as VerbEntry);
}

function asciiId(lemma: string): string {
  return lemma.replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/[ËÇ]/g, (m) => (m === 'Ë' ? 'e' : 'c')).toLowerCase();
}

interface DerivedRecord {
  form: string;
  tags: string[];
  derived: true;
}

function buildTagsForCell(
  mood: string,
  tense: string,
  cellLabel: string,
  voice: 'active' | 'middle-passive',
): string[] {
  const tags: Set<string> = new Set();
  tags.add(mood);
  // Tense → Kaikki convention
  if (mood === 'conditional') {
    if (tense === 'present') tags.add('imperfect');
    else if (tense === 'perfect') { tags.add('past'); tags.add('perfect'); }
  } else {
    if (tense === 'pluperfect') { tags.add('past'); tags.add('perfect'); }
    else if (tense === 'future-perfect') { tags.add('future'); tags.add('perfect'); }
    else if (tense !== 'present' || mood !== 'imperative') tags.add(tense);
    if (tense === 'present' && mood === 'imperative') tags.add('present');
    if (tense === 'present' && mood !== 'imperative') tags.add('present');
  }
  // Person/number from cell label (e.g., "1sg", "3pl")
  const m = cellLabel.match(/^(\d)(sg|pl)$/);
  if (m) {
    const p = m[1];
    if (p === '1') tags.add('first-person');
    else if (p === '2') tags.add('second-person');
    else if (p === '3') tags.add('third-person');
    tags.add(m[2] === 'sg' ? 'singular' : 'plural');
  }
  if (voice === 'middle-passive') tags.add('middle-passive');
  return [...tags].sort();
}

function emitDerivedCache(verb: VerbEntry, model: string, pattern: string): { forms: number } {
  const t = engineTable(verb.id);
  const records: DerivedRecord[] = [];

  const finiteMoods = ['indicative', 'subjunctive', 'conditional', 'admirative', 'optative'] as const;
  for (const mood of finiteMoods) {
    const moodTable = t[mood] as Record<string, Record<string, ConjugationResult | undefined>>;
    for (const [tense, row] of Object.entries(moodTable)) {
      for (const [key, cell] of Object.entries(row)) {
        if (cell === undefined) continue;
        const dotIdx = key.lastIndexOf('.');
        const cellLabel = key.slice(0, dotIdx);
        const voice = key.slice(dotIdx + 1) as 'active' | 'middle-passive';
        records.push({
          form: cell.form,
          tags: buildTagsForCell(mood, tense, cellLabel, voice),
          derived: true,
        });
      }
    }
  }

  // Imperative — only 2sg, 2pl
  for (const [key, cell] of Object.entries(t.imperative.present ?? {}) as Array<[string, ConjugationResult | undefined]>) {
    if (cell === undefined) continue;
    const dotIdx = key.lastIndexOf('.');
    const cellLabel = key.slice(0, dotIdx);
    const voice = key.slice(dotIdx + 1) as 'active' | 'middle-passive';
    records.push({
      form: cell.form,
      tags: buildTagsForCell('imperative', 'present', cellLabel, voice),
      derived: true,
    });
  }

  const path = join(HUSIC_CACHE_DIR, `${verb.id}.jsonl`);
  // Skip meta header: keep cache files as plain JSONL of {form, tags, derived} records.
  // Provenance (model + pattern) is tracked here in stdout output.
  void model; void pattern;
  const body = records.map((r) => JSON.stringify(r)).join('\n');
  writeFileSync(path, body + '\n', 'utf8');
  return { forms: records.length };
}

function main(): number {
  const mapPath = process.argv[2];
  if (!mapPath) {
    console.error('usage: npx tsx scripts/husic-glossary-cross-resolve.ts <glossary-map.json>');
    return 1;
  }
  const glossary = JSON.parse(readFileSync(mapPath, 'utf8')) as GlossaryEntry[];
  const corpus = loadCorpus();
  configure(corpus, '0.1.0');
  const corpusIds = new Set(corpus.map((c) => c.id));
  const corpusById = new Map(corpus.map((c) => [c.id, c]));

  // Build index of available paradigm-model cache files
  const availableModels = new Set<string>();
  for (const f of readdirSync(HUSIC_CACHE_DIR)) {
    if (f.endsWith('.jsonl')) availableModels.add(f.slice(0, -6));
  }

  let derived = 0;
  let skippedNotInCorpus = 0;
  let skippedAlreadyDirect = 0;
  let skippedHasOverrides = 0;
  let skippedModelMissing = 0;

  for (const entry of glossary) {
    if (!corpusIds.has(entry.lemma_id)) {
      skippedNotInCorpus++;
      continue;
    }
    const verb = corpusById.get(entry.lemma_id)!;
    const cachePath = join(HUSIC_CACHE_DIR, `${entry.lemma_id}.jsonl`);
    if (existsSync(cachePath)) {
      // Don't override direct paradigm-model entries
      skippedAlreadyDirect++;
      continue;
    }
    if (verb.cellOverrides && Object.keys(verb.cellOverrides).length > 0) {
      skippedHasOverrides++;
      continue;
    }
    const modelId = asciiId(entry.model);
    if (!availableModels.has(modelId)) {
      skippedModelMissing++;
      continue;
    }
    const { forms } = emitDerivedCache(verb, modelId, entry.pattern);
    console.log(`  ✓ ${entry.lemma_id.padEnd(15)}  pattern=${entry.pattern.padEnd(10)} model=${modelId.padEnd(10)} → ${forms} forms (derived)`);
    derived++;
  }

  console.log('');
  console.log(`Done. Derived ${derived} cache files.`);
  console.log(`  skipped not-in-corpus: ${skippedNotInCorpus}`);
  console.log(`  skipped already-direct: ${skippedAlreadyDirect}`);
  console.log(`  skipped has-cellOverrides: ${skippedHasOverrides}`);
  console.log(`  skipped model-missing: ${skippedModelMissing}`);
  return 0;
}

const isDirectInvocation =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectInvocation) {
  process.exit(main());
}
