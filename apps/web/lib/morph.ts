/**
 * Map engine morphological roles to Tailwind utility classes.
 */

import type { MorphologicalRole } from '@foljapp/engine';

export const MORPH_CLASS: Record<MorphologicalRole, string> = {
  particle: 'text-(--color-morph-particle) font-medium',
  auxiliary: 'text-(--color-morph-auxiliary) font-medium',
  stem: 'text-(--color-morph-stem)',
  ending: 'text-(--color-morph-ending)',
  'voice-marker': 'text-(--color-morph-voice) font-medium',
};

export function morphClass(role: MorphologicalRole): string {
  return MORPH_CLASS[role];
}
