import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Local-only drift check. It expects fresh ignored .cache audit artifacts.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const REVIEW_PATH = join(
  REPO_ROOT,
  'data',
  'corpora',
  'middle-passive-eligibility-review.json',
);
const MISSING_AUDIT_PATH = join(
  REPO_ROOT,
  '.cache',
  'corpus-missing-audit.json',
);
const MORPHOLOGY_AUDIT_PATH = join(
  REPO_ROOT,
  '.cache',
  'external-morphology-audit.json',
);
const REVIEW_ACTION = 'review_vi_tagged_nonactive_candidate';

type JsonRecord = Record<string, unknown>;

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonRecord;
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function asRecords(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value.map((row, index) => asRecord(row, `${label}[${index}]`));
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function main(): void {
  const review = readJson(REVIEW_PATH);
  const audit = readJson(MISSING_AUDIT_PATH);
  const morphology = readJson(MORPHOLOGY_AUDIT_PATH);
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(message);
  };

  const sourceArtifacts = asRecord(review.sourceArtifacts, 'sourceArtifacts');
  const auditInputs = asRecord(audit.inputs, 'audit.inputs');
  check(
    sourceArtifacts.targetGeneratedAt === auditInputs.targetGeneratedAt,
    'targetGeneratedAt does not match current audit inputs',
  );
  check(
    sourceArtifacts.coverageGeneratedAt === auditInputs.coverageGeneratedAt,
    'coverageGeneratedAt does not match current audit inputs',
  );
  check(
    sourceArtifacts.corpusVersion === auditInputs.corpusVersion,
    'corpusVersion does not match current audit inputs',
  );
  check(
    sourceArtifacts.rerun === 'npm run audit:corpus-misses:full',
    'rerun command changed or is missing',
  );

  if (!Array.isArray(review.allowedDecisions)) {
    throw new Error('allowedDecisions is not an array');
  }
  const allowed = new Set(
    review.allowedDecisions.map((decision) => String(decision)),
  );
  check(allowed.size > 0, 'allowedDecisions is empty');

  const reviewRows = asRecords(review.rows, 'review.rows');
  const duplicateIds = reviewRows
    .map((row) => String(row.verbId))
    .filter((verbId, index, ids) => ids.indexOf(verbId) !== index);
  check(
    duplicateIds.length === 0,
    `duplicate review verb IDs: ${duplicateIds.join(', ')}`,
  );

  const auditQueue = asRecords(
    audit.middlePassiveLemmaReviewQueue,
    'audit.middlePassiveLemmaReviewQueue',
  ).filter((row) => row.action === REVIEW_ACTION);
  const auditByVerb = new Map(
    auditQueue.map((row) => [String(row.verbId), row]),
  );

  check(
    reviewRows.length === auditQueue.length,
    `review row count ${reviewRows.length} != audit queue row count ${auditQueue.length}`,
  );

  const morphologyByVerb = new Map(
    asRecords(morphology.verbs, 'morphology.verbs').map((row) => [
      String(row.verbId),
      row,
    ]),
  );
  const morphologyTargets = asRecords(morphology.targets, 'morphology.targets');

  let actionTargetMisses = 0;
  let totalMiddlePassiveMisses = 0;
  for (const row of reviewRows) {
    const verbId = String(row.verbId);
    const expected = auditByVerb.get(verbId);
    const external = morphologyByVerb.get(verbId);
    actionTargetMisses += Number(row.actionTargetMisses ?? 0);
    totalMiddlePassiveMisses += Number(row.totalMiddlePassiveMisses ?? 0);

    check(allowed.has(String(row.decision)), `${verbId}: invalid decision`);
    check(row.action === REVIEW_ACTION, `${verbId}: wrong review action`);
    check(Boolean(expected), `${verbId}: missing from current audit queue`);
    check(
      Boolean(external),
      `${verbId}: missing from external morphology verbs`,
    );
    if (!expected || !external) continue;

    check(row.lemma === expected.lemma, `${verbId}: lemma drift`);
    check(
      row.translationEn === expected.translationEn,
      `${verbId}: translation drift`,
    );
    check(
      row.actionTargetMisses === expected.targetCount,
      `${verbId}: action target miss count drift`,
    );
    check(
      row.middlePassiveCoverage === expected.middlePassiveCoverage,
      `${verbId}: middle-passive coverage drift`,
    );
    check(
      row.activeCoverage === expected.activeCoverage,
      `${verbId}: active coverage drift`,
    );
    check(
      row.sourceLevel === expected.sourceLevel,
      `${verbId}: source level drift`,
    );
    check(same(row.sources, expected.sources), `${verbId}: source list drift`);

    check(
      same(row.currentFlags, external.flags ?? {}),
      `${verbId}: flag drift`,
    );
    check(
      same(
        row.middlePassiveOverrideKeys,
        external.middlePassiveOverrideKeys ?? [],
      ),
      `${verbId}: middle-passive override drift`,
    );
    check(
      row.totalMiddlePassiveTargets === external.middlePassiveTargets,
      `${verbId}: total middle-passive target drift`,
    );
    check(
      row.totalMiddlePassiveMisses === external.middlePassiveMisses,
      `${verbId}: total middle-passive miss drift`,
    );
    check(
      row.lexemeVoiceBucket === external.lexemeVoiceBucket,
      `${verbId}: lexeme voice bucket drift`,
    );
    check(
      same(row.uniparserLexeme, external.lexeme),
      `${verbId}: UniParser lexeme drift`,
    );
    check(
      same(row.analyzerSummary, external.analyzerSummary),
      `${verbId}: analyzer summary drift`,
    );
    check(same(row.verdict, external.verdict), `${verbId}: verdict drift`);

    const expectedSamples = morphologyTargets
      .filter(
        (target) =>
          target.verbId === verbId &&
          asRecord(target.verdict, `${verbId}.target.verdict`).action ===
            REVIEW_ACTION,
      )
      .slice(0, 3)
      .map((target) => {
        const targetExternal = asRecord(
          target.external,
          `${verbId}.target.external`,
        );
        const analyzer = targetExternal.uniparserAnalyzer
          ? asRecord(
              targetExternal.uniparserAnalyzer,
              `${verbId}.target.uniparserAnalyzer`,
            )
          : null;
        return {
          targetId: target.targetId,
          targetKey: target.targetKey,
          signature: target.signature,
          headToken: target.headToken,
          analyzerStatus: analyzer?.status ?? null,
          analyzerCompatibleRows: analyzer?.compatibleRows ?? null,
        };
      });
    check(same(row.samples, expectedSamples), `${verbId}: sample drift`);
  }

  const summary = asRecord(review.summary, 'review.summary');
  check(summary.lemmas === reviewRows.length, 'summary lemma count drift');
  check(
    summary.actionTargetMisses === actionTargetMisses,
    'summary actionTargetMisses drift',
  );
  check(
    summary.totalMiddlePassiveMisses === totalMiddlePassiveMisses,
    'summary totalMiddlePassiveMisses drift',
  );

  if (failures.length > 0) {
    throw new Error(`Middle-passive review drift:\n- ${failures.join('\n- ')}`);
  }

  console.log(
    `Middle-passive review is current: ${reviewRows.length} row(s), ${actionTargetMisses} action-target miss(es).`,
  );
}

main();
