/**
 * Bulk-ingest tier-1 corpus verbs from a manifest.
 *
 * v1 scope: regular Class 1 -oj verbs only. The lemma's principal parts
 * are derived directly from the -oj morphology (lemma minus -j → present
 * stem; aorist stem = present stem + 'ua'; participle = present stem + 'uar').
 * Irregular verbs and other classes are flagged in the manifest with
 * `irregular: true` and SHALL be hand-crafted as separate JSON files.
 *
 * After scaffolding, the script invokes `verify-engine.ts --only-verb <id>`
 * for each new verb. Verbs that fail verification are flagged in their
 * `notes` field with a TODO marker for manual review.
 *
 * Run: `npx tsx scripts/ingest-kaikki-batch.ts data/sources/tier-1-manifest.json`
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const VERBS_DIR = join(REPO_ROOT, 'data', 'verbs');

interface ManifestEntry {
  lemma: string;
  translationEn: string;
  class?: 1 | 2 | 3;
  auxiliary?: 'kam' | 'jam';
  /** Flag verbs known to need cellOverrides; the script scaffolds a stub
   * with a TODO marker rather than guessing the irregular forms. */
  irregular?: boolean;
  notes?: string;
}

interface VerbEntryDraft {
  id: string;
  lemma: string;
  translationEn: string;
  class: 1 | 2 | 3;
  auxiliary: 'kam' | 'jam';
  principalParts: { present: string; aorist: string; participle: string };
  sources: Array<{ source: string; reference: string }>;
  dialect: 'tosk';
  notes?: string;
}

/**
 * Derive principal parts from a lemma using class-specific morphological
 * rules. Coverage:
 *
 *   Class 1 -oj:   X + oj   → present X+o, aorist X+ua, participle X+uar
 *                  (kërkoj → kërko, kërkua, kërkuar)
 *
 *   Class 1 -uaj:  X + uaj  → present X+ua, aorist X+ua, participle X+uar
 *                  (gatuaj → gatua, gatua, gatuar) — regular -uaj only;
 *                  irregulars like shkruaj need cellOverrides.
 *
 *   Class 2:       X        → present X, aorist X, participle X+ur
 *                  (prish → prish, prish, prishur)
 *
 *   Class 1 -aj / -ej:  throw — these are mostly irregular; manifest authors
 *                       must label `irregular: true` to hand-craft.
 *
 *   Class 3:       X        → present X, aorist X, participle X+rë
 *                  (di → di, di, dirë) — most Class 3 are irregular; the
 *                  default emits the most-common shape, expecting
 *                  verify-engine to flag mismatches.
 */
function derivePrincipalParts(
  lemma: string,
  cls: 1 | 2 | 3,
): VerbEntryDraft['principalParts'] {
  if (cls === 1) {
    if (lemma.endsWith('oj')) {
      const root = lemma.slice(0, -2);
      return { present: root + 'o', aorist: root + 'ua', participle: root + 'uar' };
    }
    if (lemma.endsWith('uaj')) {
      const root = lemma.slice(0, -3);
      return { present: root + 'ua', aorist: root + 'ua', participle: root + 'uar' };
    }
    if (lemma.endsWith('aj') || lemma.endsWith('ej')) {
      throw new Error(
        `derivePrincipalParts: Class 1 ${lemma.slice(-2)} verbs are usually irregular; flag as irregular: true in manifest and hand-craft the entry`,
      );
    }
    throw new Error(`derivePrincipalParts: unrecognized Class 1 lemma ending: "${lemma}"`);
  }
  if (cls === 2) {
    return { present: lemma, aorist: lemma, participle: lemma + 'ur' };
  }
  if (cls === 3) {
    return { present: lemma, aorist: lemma, participle: lemma + 'rë' };
  }
  throw new Error(`derivePrincipalParts: unsupported class ${cls}`);
}

/** Map Albanian special letters to ASCII equivalents for the id field
 * (the schema requires kebab-case ASCII). The lemma keeps its original
 * spelling. */
function asciiId(lemma: string): string {
  return lemma
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/[ÇË]/g, (m) => (m === 'Ç' ? 'C' : 'E'))
    .toLowerCase();
}

function scaffoldVerb(entry: ManifestEntry): VerbEntryDraft {
  if (entry.irregular) {
    throw new Error(`scaffoldVerb: ${entry.lemma} is flagged irregular; hand-craft this entry`);
  }
  const cls = (entry.class ?? 1) as 1 | 2 | 3;
  const principalParts = derivePrincipalParts(entry.lemma, cls);
  return {
    id: asciiId(entry.lemma),
    lemma: entry.lemma,
    translationEn: entry.translationEn,
    class: cls,
    auxiliary: entry.auxiliary ?? 'kam',
    principalParts,
    sources: [
      {
        source: 'kaikki',
        reference: `https://en.wiktionary.org/wiki/${encodeURIComponent(entry.lemma)}#Albanian`,
      },
      { source: 'manual', reference: 'scaffolded by ingest-kaikki-batch' },
    ],
    dialect: 'tosk',
  };
}

function verifyOne(verbId: string): { ok: boolean; output: string } {
  try {
    const output = execSync(
      `npx tsx scripts/verify-engine.ts --only-verb ${verbId}`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    const ok = !/mismatch=\s*[1-9]/.test(output);
    return { ok, output };
  } catch (err) {
    return { ok: false, output: (err as Error).message };
  }
}

function main(): void {
  const manifestArg = process.argv[2];
  if (!manifestArg) {
    console.error('usage: npx tsx scripts/ingest-kaikki-batch.ts <manifest.json>');
    process.exit(1);
  }
  const manifestPath = resolve(REPO_ROOT, manifestArg);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestEntry[];

  let scaffolded = 0;
  let skippedExisting = 0;
  let skippedIrregular = 0;
  let needsReview = 0;

  for (const entry of manifest) {
    const filePath = join(VERBS_DIR, `${asciiId(entry.lemma)}.json`);
    if (existsSync(filePath)) {
      console.log(`  ⊘ ${entry.lemma} — already exists, skipping`);
      skippedExisting++;
      continue;
    }
    if (entry.irregular) {
      console.log(`  ⊘ ${entry.lemma} — flagged irregular; hand-craft this entry`);
      skippedIrregular++;
      continue;
    }
    try {
      const draft = scaffoldVerb(entry);
      writeFileSync(filePath, JSON.stringify(draft, null, 2) + '\n', 'utf8');
      const verify = verifyOne(asciiId(entry.lemma));
      if (verify.ok) {
        console.log(`  ✓ ${entry.lemma} — scaffolded and verified`);
        scaffolded++;
      } else {
        // Add TODO marker.
        draft.notes = `TODO: needs cellOverrides — verify-engine reported mismatches.\n${verify.output.slice(0, 500)}`;
        writeFileSync(filePath, JSON.stringify(draft, null, 2) + '\n', 'utf8');
        console.log(`  ⚠ ${entry.lemma} — scaffolded with TODO (verify failed)`);
        needsReview++;
      }
    } catch (err) {
      console.error(`  ✗ ${entry.lemma} — ${(err as Error).message}`);
    }
  }

  console.log('');
  console.log(`Done. Scaffolded ${scaffolded}; skipped ${skippedExisting} existing, ${skippedIrregular} irregular; ${needsReview} need review.`);
}

main();
