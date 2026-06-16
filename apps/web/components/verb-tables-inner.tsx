'use client';

import { table } from '@foljapp/engine';

import { ConjugationTable } from '@/components/conjugation-table';
import { NonFiniteForms } from '@/components/non-finite-forms';
import { findClientEntry } from '@/lib/corpus-client';
import {
  buildGlossTable,
  glossesForMood,
} from '@/lib/english-gloss-table';

interface Props {
  slug: string;
}

const INDICATIVE_TENSES = [
  'present',
  'imperfect',
  'aorist',
  'perfect',
  'pluperfect',
  'past-anterior',
  'future',
  'future-perfect',
  'future-in-past',
  'future-perfect-in-past',
];

const SUBJUNCTIVE_TENSES = ['present', 'imperfect', 'perfect', 'pluperfect'];
const CONDITIONAL_TENSES = ['present', 'perfect'];
const ADMIRATIVE_TENSES = ['present', 'imperfect', 'perfect', 'pluperfect'];
const OPTATIVE_TENSES = ['present', 'perfect'];

export function VerbTablesInner({ slug }: Props) {
  const entry = findClientEntry(slug);

  if (!entry) {
    return null;
  }

  const t = table(entry.id);
  const glossTable = buildGlossTable(entry, t);

  return (
    <>
      <ConjugationTable
        title="Indicative (Dëftore)"
        moodKey="indicative"
        tenses={t.indicative as never}
        order={INDICATIVE_TENSES}
        glosses={glossesForMood(glossTable, 'indicative')}
      />
      <ConjugationTable
        title="Subjunctive (Lidhore)"
        moodKey="subjunctive"
        tenses={t.subjunctive as never}
        order={SUBJUNCTIVE_TENSES}
        glosses={glossesForMood(glossTable, 'subjunctive')}
      />
      <ConjugationTable
        title="Conditional (Kushtore)"
        moodKey="conditional"
        tenses={t.conditional as never}
        order={CONDITIONAL_TENSES}
        glosses={glossesForMood(glossTable, 'conditional')}
      />
      <ConjugationTable
        title="Admirative (Habitore)"
        moodKey="admirative"
        tenses={t.admirative as never}
        order={ADMIRATIVE_TENSES}
        glosses={glossesForMood(glossTable, 'admirative')}
      />
      <ConjugationTable
        title="Optative (Dëshirore)"
        moodKey="optative"
        tenses={t.optative as never}
        order={OPTATIVE_TENSES}
        glosses={glossesForMood(glossTable, 'optative')}
      />
      <ConjugationTable
        title="Imperative (Urdhërore)"
        moodKey="imperative"
        tenses={t.imperative as never}
        order={['present']}
        imperativeOnly
        glosses={glossesForMood(glossTable, 'imperative')}
      />

      <NonFiniteForms
        forms={t.nonFinite as never}
        glosses={glossTable.nonFinite}
      />
    </>
  );
}
