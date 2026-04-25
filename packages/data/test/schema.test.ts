/**
 * Zod schema parsing tests.
 */

import { describe, expect, it } from 'vitest';

import { verbEntrySchema } from '../src/schema.js';

describe('verbEntrySchema', () => {
  it('parses a valid entry', () => {
    const valid = {
      id: 'punoj',
      lemma: 'punoj',
      translationEn: 'to work',
      class: 1 as const,
      auxiliary: 'kam' as const,
      principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
      sources: [{ source: 'husic' as const, reference: '1A' }],
    };
    expect(() => verbEntrySchema.parse(valid)).not.toThrow();
  });

  it('rejects missing principal parts', () => {
    const invalid = {
      id: 'punoj',
      lemma: 'punoj',
      translationEn: 'to work',
      class: 1,
      auxiliary: 'kam',
      principalParts: { present: 'puno' /* missing aorist + participle */ },
      sources: [{ source: 'husic', reference: '1A' }],
    };
    const result = verbEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty sources', () => {
    const invalid = {
      id: 'punoj',
      lemma: 'punoj',
      translationEn: 'to work',
      class: 1,
      auxiliary: 'kam',
      principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
      sources: [],
    };
    const result = verbEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects non-kebab-case id', () => {
    const invalid = {
      id: 'PunOJ',
      lemma: 'punoj',
      translationEn: 'to work',
      class: 1,
      auxiliary: 'kam',
      principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
      sources: [{ source: 'husic', reference: '1A' }],
    };
    const result = verbEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects unknown auxiliary', () => {
    const invalid = {
      id: 'punoj',
      lemma: 'punoj',
      translationEn: 'to work',
      class: 1,
      auxiliary: 'wrong',
      principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
      sources: [{ source: 'husic', reference: '1A' }],
    };
    const result = verbEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
