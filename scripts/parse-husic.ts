/**
 * Parse a Husić *Albanian Verb Dictionary and Manual* digital source into
 * `.cache/husic/<id>.jsonl` files (Kaikki-shape: one `{form, tags}` record
 * per line) for consumption by `verify-engine.ts`.
 *
 * v1 SCAFFOLDING: this script ships the architecture and CLI surface but
 * the format-specific parser (`parseHusicSource`) is a stub returning an
 * empty array. Implementing the parser depends on the chosen digital
 * source format (PDF text-extraction, OCR, hand-tabulated TSV, etc.).
 *
 * Once a digital source is acquired:
 *   1. Choose the format (see `packages/engine/docs/husic-format.md`).
 *   2. Implement `parseHusicSource(input, options)` to match that format.
 *   3. Run: `npx tsx scripts/parse-husic.ts --source path/to/husic-input`.
 *
 * The output matches `verify-engine.ts`'s `KaikkiForm` shape so the same
 * tag-set filter logic applies via `findHusicForm`.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HUSIC_CACHE_DIR = join(REPO_ROOT, '.cache', 'husic');

interface HusicForm {
  form: string;
  tags: string[];
}

interface HusicEntry {
  /** Kebab-case verb id matching the corpus entry. */
  id: string;
  /** Lemma in Standard Albanian orthography. */
  lemma: string;
  forms: HusicForm[];
}

interface ParseOptions {
  /** Path to the digital Husić source (PDF, TSV, JSON — format-dependent). */
  sourcePath: string;
  /** Filter forms to a single verb id (debugging / pilot run). */
  onlyVerb?: string;
}

/**
 * Format-specific parser for Husić's source. STUB — implement once a
 * digital source is in hand. See `packages/engine/docs/husic-format.md`
 * for the expected output shape and tag vocabulary.
 *
 * @param sourcePath Path to the digital source.
 * @param options Optional filters.
 * @returns Array of HusicEntry per verb in the source.
 */
function parseHusicSource(
  sourcePath: string,
  options: ParseOptions,
): HusicEntry[] {
  if (!existsSync(sourcePath)) {
    console.error(`✗ source path does not exist: ${sourcePath}`);
    return [];
  }
  console.warn(
    `⚠ parseHusicSource is a stub. Returning [] until a format-specific parser is implemented.\n` +
      `  See packages/engine/docs/husic-format.md for guidance.`,
  );
  if (options.onlyVerb) {
    console.warn(`  (--only-verb=${options.onlyVerb} would filter once the parser is implemented)`);
  }
  return [];
}

/**
 * Map Husić's Albanian-label paradigm tags to the engine's English-tag
 * vocabulary. Used by the format-specific parser to normalize tag names.
 */
export function mapHusicLabelToTags(
  paradigmLabel: string,
  cellLabel: { person: 1 | 2 | 3; number: 'singular' | 'plural' },
): string[] {
  const tags = new Set<string>();
  // Mood + tense
  const lc = paradigmLabel.toLowerCase().trim();
  if (lc.includes('dëftore')) tags.add('indicative');
  if (lc.includes('lidhore')) tags.add('subjunctive');
  if (lc.includes('kushtore')) tags.add('conditional');
  if (lc.includes('habitore')) tags.add('admirative');
  if (lc.includes('dëshirore')) tags.add('optative');
  if (lc.includes('urdhërore')) tags.add('imperative');

  if (lc.includes('më se e kryer')) {
    // pluperfect → past + perfect (Kaikki convention)
    tags.add('past');
    tags.add('perfect');
  } else if (lc.includes('e kryer e tejshkuar')) {
    tags.add('past-anterior');
  } else if (lc.includes('e ardhme e së shkuarës e përparme')) {
    tags.add('future-perfect-in-past');
  } else if (lc.includes('e ardhme e së shkuarës')) {
    tags.add('future-in-past');
  } else if (lc.includes('e ardhme e përparme')) {
    // future-perfect → future + perfect
    tags.add('future');
    tags.add('perfect');
  } else if (lc.includes('e ardhme')) {
    tags.add('future');
  } else if (lc.includes('e kryer e thjeshtë')) {
    tags.add('aorist');
  } else if (lc.includes('e kryer')) {
    tags.add('perfect');
  } else if (lc.includes('e pakryer')) {
    // For conditional/admirative this is the marker for the imperfect-form
    // construction; for indicative it's the imperfect tense itself.
    // The construction-vs-tense disambiguation is handled by the mood tags
    // already added above.
    tags.add('imperfect');
  } else if (lc.includes('e tashme')) {
    tags.add('present');
  }

  // Voice
  if (lc.includes('joveprore') || lc.includes('pësore')) {
    tags.add('middle-passive');
  }
  // (omit explicit 'active' tag; absence implies active.)

  // Person + number
  if (cellLabel.person === 1) tags.add('first-person');
  if (cellLabel.person === 2) tags.add('second-person');
  if (cellLabel.person === 3) tags.add('third-person');
  if (cellLabel.number === 'singular') tags.add('singular');
  if (cellLabel.number === 'plural') tags.add('plural');

  return [...tags];
}

function emitJsonl(entries: HusicEntry[]): { written: number } {
  if (!existsSync(HUSIC_CACHE_DIR)) {
    mkdirSync(HUSIC_CACHE_DIR, { recursive: true });
  }
  let written = 0;
  for (const entry of entries) {
    const outPath = join(HUSIC_CACHE_DIR, `${entry.id}.jsonl`);
    const lines = entry.forms.map((f) => JSON.stringify(f)).join('\n');
    writeFileSync(outPath, lines + (lines ? '\n' : ''), 'utf8');
    written++;
  }
  return { written };
}

function parseArgs(): ParseOptions {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const onlyVerbIdx = args.indexOf('--only-verb');
  const sourcePath = sourceIdx >= 0 ? args[sourceIdx + 1]! : '';
  const opts: ParseOptions = { sourcePath };
  if (onlyVerbIdx >= 0) opts.onlyVerb = args[onlyVerbIdx + 1]!;
  return opts;
}

function main(): void {
  const opts = parseArgs();
  if (!opts.sourcePath) {
    console.error('usage: npx tsx scripts/parse-husic.ts --source <path> [--only-verb <id>]');
    console.error('');
    console.error('Acquire a digital copy of Husić first; see');
    console.error('  packages/engine/docs/husic-format.md');
    process.exit(1);
  }

  console.log(`▶ Parsing Husić source: ${opts.sourcePath}`);
  const entries = parseHusicSource(opts.sourcePath, opts);
  if (entries.length === 0) {
    console.log('  (no entries — parser is a stub or the source is empty)');
    return;
  }

  const { written } = emitJsonl(entries);
  console.log(`✓ Wrote ${written} verb files to ${HUSIC_CACHE_DIR}`);
}

main();
