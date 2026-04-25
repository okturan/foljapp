import type { ConjugationResult } from '@foljapp/engine';

import { DecomposedForm } from '@/components/decomposed-form';

interface Props {
  forms: Record<string, ConjugationResult>;
}

const LABELS: Record<string, { en: string; sq: string }> = {
  participle: { en: 'Participle', sq: 'Pjesore' },
  infinitive: { en: 'Infinitive', sq: 'Paskajore' },
  gerund: { en: 'Gerund', sq: 'Përcjellore' },
  privative: { en: 'Privative', sq: 'Mohore' },
  temporal: { en: 'Temporal', sq: 'Kohore' },
};

const ORDER = ['participle', 'infinitive', 'gerund', 'privative', 'temporal'];

export function NonFiniteForms({ forms }: Props) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight text-stone-900">
        Non-finite forms (Format e pashtjelluara)
      </h2>
      <dl className="mt-3 divide-y divide-stone-100 border-y border-stone-200">
        {ORDER.map((key) => {
          const label = LABELS[key];
          const result = forms[key];
          if (!label || !result) return null;
          return (
            <div
              key={key}
              id={`non-finite-${key}`}
              className="grid scroll-mt-20 grid-cols-1 gap-2 py-3 sm:grid-cols-[200px_1fr]"
            >
              <dt className="text-sm text-stone-500">
                {label.en}{' '}
                <span className="text-stone-400">({label.sq})</span>
              </dt>
              <dd>
                <DecomposedForm segments={result.decomposition} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
