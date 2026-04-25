import type { VerbEntry } from '@foljapp/engine';

import { toIpa, toIpaBracketed } from '@/lib/ipa';

interface Props {
  entry: VerbEntry;
}

export function VerbHeader({ entry }: Props) {
  return (
    <header className="border-b border-stone-200 pb-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-5xl font-bold tracking-tight text-stone-900">
          {entry.lemma}
        </h1>
        <p className="text-lg text-stone-600">{entry.translationEn}</p>
      </div>
      <p className="mt-1 font-mono text-sm italic text-stone-500">
        {toIpaBracketed(entry.lemma)}
      </p>
      <p className="mt-1 text-sm text-stone-500">
        1sg present indicative
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-stone-200 px-3 py-1 text-stone-700">
          Zgjedhimi {entry.class}
        </span>
        <span className="rounded-full border border-stone-200 px-3 py-1 text-stone-700">
          auxiliary:{' '}
          <span className="font-mono font-medium">{entry.auxiliary}</span>
        </span>
        {entry.flags?.isSuppletive ? (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-700">
            suppletive
          </span>
        ) : null}
        {entry.flags?.hasMutation ? (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-700">
            phonological mutation
          </span>
        ) : null}
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <div className="flex flex-col">
          <dt className="text-stone-500">present stem</dt>
          <dd className="font-mono text-stone-900">
            {entry.principalParts.present}{' '}
            <span className="text-xs italic text-stone-400">
              /{toIpa(entry.principalParts.present)}/
            </span>
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-stone-500">aorist stem</dt>
          <dd className="font-mono text-stone-900">
            {entry.principalParts.aorist}{' '}
            <span className="text-xs italic text-stone-400">
              /{toIpa(entry.principalParts.aorist)}/
            </span>
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-stone-500">participle</dt>
          <dd className="font-mono text-stone-900">
            {entry.principalParts.participle}{' '}
            <span className="text-xs italic text-stone-400">
              /{toIpa(entry.principalParts.participle)}/
            </span>
          </dd>
        </div>
      </dl>
    </header>
  );
}
