/**
 * Zod schemas for validating verb corpus entries and the index manifest.
 */

import { z } from 'zod';

export const verbEntrySourceSchema = z.object({
  source: z.enum(['uniparser', 'kaikki', 'husic', 'manual']),
  reference: z.string().min(1),
});

export const verbEntryFlagsSchema = z
  .object({
    isSuppletive: z.boolean().optional(),
    hasMutation: z.boolean().optional(),
    irregularAorist: z.boolean().optional(),
  })
  .strict();

export const verbEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
    lemma: z.string().min(1),
    translationEn: z.string().min(1),
    class: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    auxiliary: z.enum(['kam', 'jam']),
    principalParts: z.object({
      present: z.string().min(1),
      aorist: z.string().min(1),
      participle: z.string().min(1),
    }),
    sources: z.array(verbEntrySourceSchema).min(1),
    flags: verbEntryFlagsSchema.optional(),
    dialect: z.enum(['tosk', 'geg']).optional(),
    notes: z.string().optional(),
  })
  .strict();

export const corpusIndexEntrySchema = z.object({
  id: z.string(),
  lemma: z.string(),
  translationEn: z.string(),
  class: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  auxiliary: z.enum(['kam', 'jam']),
});

export const corpusIndexSchema = z.array(corpusIndexEntrySchema);

export const corpusVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  generatedAt: z.string(),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export type VerbEntryInput = z.input<typeof verbEntrySchema>;
export type VerbEntry = z.output<typeof verbEntrySchema>;
export type CorpusIndexEntry = z.output<typeof corpusIndexEntrySchema>;
export type CorpusVersion = z.output<typeof corpusVersionSchema>;
