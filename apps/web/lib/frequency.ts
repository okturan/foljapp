/**
 * Frequency tier per corpus verb. Hand-curated; methodology in
 * openspec/changes/archive/.../add-corpus-frequency-overlay/design.md
 * and surfaced on the /references page.
 */

import frequencyData from '../../../data/verbs/frequency.json';

export type FrequencyTier = 'core' | 'common' | 'uncommon' | 'rare';

export interface FrequencyEntry {
  tier: FrequencyTier;
  udCount?: number;
  notes?: string;
}

export const FREQUENCY = frequencyData as Record<string, FrequencyEntry>;

const TIER_ORDER: Record<FrequencyTier, number> = {
  core: 0,
  common: 1,
  uncommon: 2,
  rare: 3,
};

export function tierRank(tier: FrequencyTier): number {
  return TIER_ORDER[tier];
}

export function getFrequency(verbId: string): FrequencyEntry | undefined {
  return FREQUENCY[verbId];
}

export const TIER_DESCRIPTIONS: Record<FrequencyTier, string> = {
  core: 'Among the ~50 most common verbs in standard Albanian',
  common: 'Frequent in everyday text and speech',
  uncommon: 'Domain-specific or moderate frequency',
  rare: 'Low frequency in general text',
};
