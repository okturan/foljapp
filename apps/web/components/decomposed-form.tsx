import type { DecompositionSegment } from '@foljapp/engine';
import { Fragment } from 'react';


import { morphClass } from '@/lib/morph';

interface Props {
  segments: DecompositionSegment[];
}

const WORD_ROLES = new Set(['particle', 'auxiliary', 'voice-marker']);

export function DecomposedForm({ segments }: Props) {
  return (
    <span className="font-mono text-base">
      {segments.map((seg, i) => {
        const prev = segments[i - 1];
        const needsSpace =
          prev !== undefined &&
          (WORD_ROLES.has(prev.role) || WORD_ROLES.has(seg.role));
        return (
          <Fragment key={i}>
            {needsSpace ? ' ' : null}
            <span
              className={morphClass(seg.role)}
              aria-label={`${seg.role} ${seg.surface}`}
            >
              {seg.surface}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
