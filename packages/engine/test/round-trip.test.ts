/**
 * Engine round-trip — every verb in fixtures, table() works without
 * non-UnsupportedCellError throws.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { configure, table } from '../src/conjugate.js';

import { fixtures } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('engine.table round-trip', () => {
  for (const verb of fixtures) {
    it(`table(${verb.id}) populates indicative present 1sg active`, () => {
      const t = table(verb.id);
      const cell = (t.indicative.present as Record<string, unknown>)['1sg.active'];
      expect(cell).toBeDefined();
    });

    it(`table(${verb.id}) populates non-finite participle`, () => {
      const t = table(verb.id);
      expect(t.nonFinite.participle).toBeDefined();
      expect(t.nonFinite.participle.form.length).toBeGreaterThan(0);
    });
  }
});
