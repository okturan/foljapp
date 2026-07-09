import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Local-only drift check. It expects fresh ignored .cache audit artifacts.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const REVIEW_PATHS = [
  join(REPO_ROOT, 'data', 'corpora', 'middle-passive-eligibility-review.json'),
  join(
    REPO_ROOT,
    'data',
    'corpora',
    'middle-passive-source-cache-review.json',
  ),
  join(
    REPO_ROOT,
    'data',
    'corpora',
    'middle-passive-lexicon-review.json',
  ),
];
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
  const reviews = REVIEW_PATHS.map((path) => ({
    path,
    review: readJson(path),
  }));
  const audit = readJson(MISSING_AUDIT_PATH);
  const morphology = readJson(MORPHOLOGY_AUDIT_PATH);
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(message);
  };

  const auditInputs = asRecord(audit.inputs, 'audit.inputs');
  const auditQueue = asRecords(
    audit.middlePassiveLemmaReviewQueue,
    'audit.middlePassiveLemmaReviewQueue',
  );
  const auditByVerb = new Map(
    auditQueue.map((row) => [
      `${String(row.action)}\t${String(row.verbId)}`,
      row,
    ]),
  );
  const morphologyByVerb = new Map(
    asRecords(morphology.verbs, 'morphology.verbs').map((row) => [
      String(row.verbId),
      row,
    ]),
  );
  const morphologyTargets = asRecords(morphology.targets, 'morphology.targets');

  const seenReviewKeys = new Map<string, string>();
  let totalRows = 0;
  let totalActionTargetMisses = 0;

  for (const { path, review } of reviews) {
    const sourceArtifacts = asRecord(
      review.sourceArtifacts,
      `${path}.sourceArtifacts`,
    );
    check(
      sourceArtifacts.targetGeneratedAt === auditInputs.targetGeneratedAt,
      `${path}: targetGeneratedAt does not match current audit inputs`,
    );
    check(
      sourceArtifacts.coverageGeneratedAt === auditInputs.coverageGeneratedAt,
      `${path}: coverageGeneratedAt does not match current audit inputs`,
    );
    check(
      sourceArtifacts.corpusVersion === auditInputs.corpusVersion,
      `${path}: corpusVersion does not match current audit inputs`,
    );
    check(
      sourceArtifacts.rerun === 'npm run audit:corpus-misses:full',
      `${path}: rerun command changed or is missing`,
    );

    if (!Array.isArray(review.allowedDecisions)) {
      throw new Error(`${path}: allowedDecisions is not an array`);
    }
    const allowed = new Set(
      review.allowedDecisions.map((decision) => String(decision)),
    );
    check(allowed.size > 0, `${path}: allowedDecisions is empty`);

    const reviewRows = asRecords(review.rows, `${path}.rows`);
    totalRows += reviewRows.length;

    const requiredCompleteAction =
      typeof review.requiredCompleteAction === 'string'
        ? review.requiredCompleteAction
        : null;
    if (requiredCompleteAction) {
      const expectedCount = auditQueue.filter(
        (row) => row.action === requiredCompleteAction,
      ).length;
      check(
        reviewRows.length === expectedCount,
        `${path}: review row count ${reviewRows.length} != ${requiredCompleteAction} queue count ${expectedCount}`,
      );
    }

    let actionTargetMisses = 0;
    let totalMiddlePassiveMisses = 0;
    let exactSourceCacheTargetMisses = 0;
    let headTokenSourceCacheTargetMisses = 0;
    const decisionCounts = new Map<string, number>();

    for (const row of reviewRows) {
      const action = String(row.action);
      const verbId = String(row.verbId);
      const key = `${action}\t${verbId}`;
      const expected = auditByVerb.get(key);
      const external = morphologyByVerb.get(verbId);
      actionTargetMisses += Number(row.actionTargetMisses ?? 0);
      totalActionTargetMisses += Number(row.actionTargetMisses ?? 0);
      totalMiddlePassiveMisses += Number(row.totalMiddlePassiveMisses ?? 0);
      exactSourceCacheTargetMisses += Number(
        row.exactSourceCacheTargetMisses ?? 0,
      );
      headTokenSourceCacheTargetMisses += Number(
        row.headTokenSourceCacheTargetMisses ?? 0,
      );
      const decision = String(row.decision);
      decisionCounts.set(decision, (decisionCounts.get(decision) ?? 0) + 1);

      check(allowed.has(decision), `${path}: ${verbId}: invalid decision`);
      const previous = seenReviewKeys.get(key);
      check(
        !previous,
        `${path}: duplicate reviewed action/verb also in ${previous}: ${key}`,
      );
      seenReviewKeys.set(key, path);

      if (decision !== 'needs_source') {
        const evidence = row.decisionEvidence;
        check(
          Array.isArray(evidence) && evidence.length > 0,
          `${path}: ${verbId}: resolved decision needs decisionEvidence`,
        );
        if (Array.isArray(evidence)) {
          for (const [index, item] of evidence.entries()) {
            const record = asRecord(
              item,
              `${path}.${verbId}.decisionEvidence[${index}]`,
            );
            check(
              typeof record.source === 'string' && record.source.length > 0,
              `${path}: ${verbId}: decisionEvidence[${index}] missing source`,
            );
            check(
              typeof record.basis === 'string' && record.basis.length > 0,
              `${path}: ${verbId}: decisionEvidence[${index}] missing basis`,
            );
          }
        }
      }
      check(
        Boolean(expected),
        `${path}: ${verbId}: missing from current audit queue for action ${action}`,
      );
      check(
        Boolean(external),
        `${path}: ${verbId}: missing from external morphology verbs`,
      );
      if (!expected || !external) continue;

      if (requiredCompleteAction) {
        check(
          action === requiredCompleteAction,
          `${path}: ${verbId}: wrong review action`,
        );
      }
      if (Object.hasOwn(row, 'lemma')) {
        check(row.lemma === expected.lemma, `${path}: ${verbId}: lemma drift`);
      }
      if (Object.hasOwn(row, 'translationEn')) {
        check(
          row.translationEn === expected.translationEn,
          `${path}: ${verbId}: translation drift`,
        );
      }
      if (Object.hasOwn(row, 'actionTargetMisses')) {
        check(
          row.actionTargetMisses === expected.targetCount,
          `${path}: ${verbId}: action target miss count drift`,
        );
      }
      if (Object.hasOwn(row, 'exactSourceCacheTargetMisses')) {
        const support = asRecord(
          expected.sourceCacheDirectSupport,
          `${path}.${verbId}.sourceCacheDirectSupport`,
        );
        check(
          row.exactSourceCacheTargetMisses === support.exactTargetCount,
          `${path}: ${verbId}: exact source-cache target count drift`,
        );
      }
      if (Object.hasOwn(row, 'headTokenSourceCacheTargetMisses')) {
        const support = asRecord(
          expected.sourceCacheDirectSupport,
          `${path}.${verbId}.sourceCacheDirectSupport`,
        );
        check(
          row.headTokenSourceCacheTargetMisses === support.headTokenCount,
          `${path}: ${verbId}: head-token source-cache target count drift`,
        );
      }
      if (Object.hasOwn(row, 'middlePassiveCoverage')) {
        check(
          row.middlePassiveCoverage === expected.middlePassiveCoverage,
          `${path}: ${verbId}: middle-passive coverage drift`,
        );
      }
      if (Object.hasOwn(row, 'activeCoverage')) {
        check(
          row.activeCoverage === expected.activeCoverage,
          `${path}: ${verbId}: active coverage drift`,
        );
      }
      if (Object.hasOwn(row, 'sourceLevel')) {
        check(
          row.sourceLevel === expected.sourceLevel,
          `${path}: ${verbId}: source level drift`,
        );
      }
      if (Object.hasOwn(row, 'sources')) {
        check(
          same(row.sources, expected.sources),
          `${path}: ${verbId}: source list drift`,
        );
      }
      if (Object.hasOwn(row, 'currentFlags')) {
        check(
          same(row.currentFlags, external.flags ?? {}),
          `${path}: ${verbId}: flag drift`,
        );
      }
      if (Object.hasOwn(row, 'middlePassiveOverrideKeys')) {
        check(
          same(
            row.middlePassiveOverrideKeys,
            external.middlePassiveOverrideKeys ?? [],
          ),
          `${path}: ${verbId}: middle-passive override drift`,
        );
      }
      if (Object.hasOwn(row, 'totalMiddlePassiveTargets')) {
        check(
          row.totalMiddlePassiveTargets === external.middlePassiveTargets,
          `${path}: ${verbId}: total middle-passive target drift`,
        );
      }
      if (Object.hasOwn(row, 'totalMiddlePassiveMisses')) {
        check(
          row.totalMiddlePassiveMisses === external.middlePassiveMisses,
          `${path}: ${verbId}: total middle-passive miss drift`,
        );
      }
      if (Object.hasOwn(row, 'lexemeVoiceBucket')) {
        check(
          row.lexemeVoiceBucket === external.lexemeVoiceBucket,
          `${path}: ${verbId}: lexeme voice bucket drift`,
        );
      }
      if (Object.hasOwn(row, 'uniparserLexeme')) {
        check(
          same(row.uniparserLexeme, external.lexeme),
          `${path}: ${verbId}: UniParser lexeme drift`,
        );
      }
      if (Object.hasOwn(row, 'analyzerSummary')) {
        check(
          same(row.analyzerSummary, external.analyzerSummary),
          `${path}: ${verbId}: analyzer summary drift`,
        );
      }
      if (Object.hasOwn(row, 'verdict')) {
        check(
          same(row.verdict, external.verdict),
          `${path}: ${verbId}: verdict drift`,
        );
      }
      if (Object.hasOwn(row, 'samples')) {
        const expectedSamples = morphologyTargets
          .filter(
            (target) =>
              target.verbId === verbId &&
              asRecord(target.verdict, `${verbId}.target.verdict`).action ===
                action,
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
        check(
          same(row.samples, expectedSamples),
          `${path}: ${verbId}: sample drift`,
        );
      }
    }

    const summary = asRecord(review.summary, `${path}.summary`);
    const summaryRows = summary.lemmas ?? summary.groups;
    check(summaryRows === reviewRows.length, `${path}: summary row count drift`);
    if (Object.hasOwn(summary, 'actionTargetMisses')) {
      check(
        summary.actionTargetMisses === actionTargetMisses,
        `${path}: summary actionTargetMisses drift`,
      );
    }
    if (Object.hasOwn(summary, 'totalMiddlePassiveMisses')) {
      check(
        summary.totalMiddlePassiveMisses === totalMiddlePassiveMisses,
        `${path}: summary totalMiddlePassiveMisses drift`,
      );
    }
    if (Object.hasOwn(summary, 'exactSourceCacheTargetMisses')) {
      check(
        summary.exactSourceCacheTargetMisses === exactSourceCacheTargetMisses,
        `${path}: summary exactSourceCacheTargetMisses drift`,
      );
    }
    if (Object.hasOwn(summary, 'headTokenSourceCacheTargetMisses')) {
      check(
        summary.headTokenSourceCacheTargetMisses ===
          headTokenSourceCacheTargetMisses,
        `${path}: summary headTokenSourceCacheTargetMisses drift`,
      );
    }
    const expectedDecisionCounts = Object.fromEntries(
      [...allowed].map((decision) => [
        decision,
        decisionCounts.get(decision) ?? 0,
      ]),
    );
    check(
      same(summary.decisionCounts, expectedDecisionCounts),
      `${path}: summary decisionCounts drift`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`Middle-passive review drift:\n- ${failures.join('\n- ')}`);
  }

  console.log(
    `Middle-passive review is current: ${totalRows} row(s), ${totalActionTargetMisses} action-target miss(es).`,
  );
}

main();
