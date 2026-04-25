'use client';

import type { DecompositionSegment } from '@foljapp/engine';
import { Fragment } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { morphClass } from '@/lib/morph';
import { explain } from '@/lib/segment-explanations';

interface Props {
  segments: DecompositionSegment[];
}

const WORD_ROLES = new Set(['particle', 'auxiliary', 'voice-marker']);

export function DecomposedForm({ segments }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <span className="font-mono text-base">
        {segments.map((seg, i) => {
          const prev = segments[i - 1];
          const needsSpace =
            prev !== undefined &&
            (WORD_ROLES.has(prev.role) || WORD_ROLES.has(seg.role));
          const explanation = explain(seg);
          return (
            <Fragment key={i}>
              {needsSpace ? ' ' : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    role="button"
                    className={`${morphClass(seg.role)} cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 focus-visible:rounded`}
                    title={explanation}
                    aria-label={explanation}
                  >
                    {seg.surface}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{explanation}</TooltipContent>
              </Tooltip>
            </Fragment>
          );
        })}
      </span>
    </TooltipProvider>
  );
}
