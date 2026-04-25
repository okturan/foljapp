/**
 * IGT and CoNLL-U formatter tests.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { VerbEntry } from '@foljapp/engine';
import { configure } from '@foljapp/engine';
import { beforeAll, describe, expect, it } from 'vitest';

import { formatConllu, formatIgt, formatIgtTable } from './igt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBS_DIR = join(__dirname, '..', '..', '..', 'data', 'verbs');

beforeAll(() => {
  const files = readdirSync(VERBS_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'index.json' && f !== 'version.json',
  );
  const corpus = files.map((f) =>
    JSON.parse(readFileSync(join(VERBS_DIR, f), 'utf8')),
  );
  configure(corpus as VerbEntry[], '0.1.0');
});

describe('formatIgt', () => {
  it('compound perfect 1sg of punoj produces a 4-line block', () => {
    const out = formatIgt('punoj', {
      mood: 'indicative',
      tense: 'perfect',
      person: 1,
      number: 'singular',
    });
    expect(out).toContain('# indicative perfect 1sg');
    expect(out).toContain('kam');
    expect(out).toContain('punu');
    expect(out).toContain('AUX');
    expect(out).toContain('STEM');
    expect(out).toContain('"to work"');
  });

  it('subjunctive 1sg of punoj contains the SBJV gloss', () => {
    const out = formatIgt('punoj', {
      mood: 'subjunctive',
      tense: 'present',
      person: 1,
      number: 'singular',
    });
    expect(out).toContain('SBJV');
    expect(out).toContain('të');
  });

  it('jam aorist 1sg returns qeshë', () => {
    const out = formatIgt('jam', {
      mood: 'indicative',
      tense: 'aorist',
      person: 1,
      number: 'singular',
    });
    expect(out).toContain('qeshë');
  });

  it('pjek aorist 1sg shows the mutated stem poq', () => {
    const out = formatIgt('pjek', {
      mood: 'indicative',
      tense: 'aorist',
      person: 1,
      number: 'singular',
    });
    // IGT pads segments into columns; check the mutated stem and the
    // header that locates the cell.
    expect(out).toContain('# indicative aorist 1sg');
    expect(out).toContain('poq');
    expect(out).toContain('STEM');
  });
});

describe('formatIgtTable', () => {
  it('contains a header with verb metadata', () => {
    const out = formatIgtTable('punoj');
    expect(out).toContain('verb: punoj');
    expect(out).toContain('translation: to work');
    expect(out).toContain('class: 1');
    expect(out).toContain('auxiliary: kam');
    expect(out).toContain('engine:');
  });

  it('includes blocks from every supported mood', () => {
    const out = formatIgtTable('punoj');
    expect(out).toContain('# indicative present 1sg');
    expect(out).toContain('# subjunctive present 1sg');
    expect(out).toContain('# conditional present 1sg');
    expect(out).toContain('# admirative present 1sg');
    expect(out).toContain('# optative present 1sg');
    expect(out).toContain('# imperative present 2sg');
  });
});

describe('formatConllu', () => {
  it('emits sent_id header and tab-separated rows', () => {
    const out = formatConllu('punoj');
    expect(out).toContain('# sent_id = punoj');
    expect(out).toContain('# text = punoj');
    expect(out).toContain('VERB');
    // First row should be ID 1, FORM punoj, LEMMA punoj
    const firstDataLine = out.split('\n').find((l) => /^\d+\t/.test(l));
    expect(firstDataLine).toBeDefined();
    expect(firstDataLine!.split('\t')[0]).toBe('1');
  });

  it('contains all six indicative-present cells', () => {
    const out = formatConllu('punoj');
    for (const cell of ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']) {
      expect(out).toContain(`Cell=indicative-present-${cell}`);
    }
  });

  it('FEATS contain Mood and Tense values', () => {
    const out = formatConllu('punoj');
    expect(out).toContain('Mood=Ind');
    expect(out).toContain('Tense=Pres');
    expect(out).toContain('VerbForm=Fin');
    expect(out).toContain('Voice=Act');
  });
});
