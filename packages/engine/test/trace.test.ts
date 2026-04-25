import { beforeAll, describe, expect, it } from 'vitest';

import { configure, conjugate, trace } from '../src/index.js';

import { fixtures } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('trace', () => {
  it('returns a corpus-lookup as the first step', () => {
    const steps = trace('punoj', {
      mood: 'indicative',
      tense: 'present',
      voice: 'active',
      person: 1,
      number: 'singular',
    });
    expect(steps[0]?.kind).toBe('corpus-lookup');
    expect(steps[0]?.summary).toContain('punoj');
  });

  it('ends with a final step whose form matches conjugate()', () => {
    const opts = {
      mood: 'indicative' as const,
      tense: 'perfect' as const,
      voice: 'active' as const,
      person: 1 as const,
      number: 'singular' as const,
    };
    const steps = trace('punoj', opts);
    const last = steps[steps.length - 1];
    expect(last?.kind).toBe('final');
    if (last?.kind === 'final') {
      expect(last.form).toBe(conjugate('punoj', opts).form);
      expect(last.form).toBe('kam punuar');
    }
  });

  it('compound perfect surfaces an auxiliary-recursion step', () => {
    const steps = trace('punoj', {
      mood: 'indicative',
      tense: 'perfect',
      voice: 'active',
      person: 1,
      number: 'singular',
    });
    const aux = steps.find((s) => s.kind === 'auxiliary-recursion');
    expect(aux).toBeDefined();
    if (aux?.kind === 'auxiliary-recursion') {
      expect(aux.auxiliary).toBe('kam');
      expect(aux.result).toBe('kam');
    }
  });

  it('suppletive verb produces a suppletive-lookup step', () => {
    const steps = trace('jam', {
      mood: 'indicative',
      tense: 'present',
      voice: 'active',
      person: 1,
      number: 'singular',
    });
    expect(steps.some((s) => s.kind === 'suppletive-lookup')).toBe(true);
  });

  it('subjunctive produces a particle-prepend step for "të"', () => {
    const steps = trace('punoj', {
      mood: 'subjunctive',
      tense: 'present',
      voice: 'active',
      person: 1,
      number: 'singular',
    });
    const particle = steps.find(
      (s) => s.kind === 'particle-prepend' && s.particle === 'të',
    );
    expect(particle).toBeDefined();
  });

  it('agrees with conjugate on the final form across a wide sample', () => {
    const samples: Array<{ verb: string; opts: Parameters<typeof conjugate>[1] }> = [
      { verb: 'punoj', opts: { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'indicative', tense: 'perfect', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'subjunctive', tense: 'present', voice: 'active', person: 2, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'conditional', tense: 'present', voice: 'active', person: 3, number: 'plural' } },
      { verb: 'punoj', opts: { mood: 'admirative', tense: 'present', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'optative', tense: 'present', voice: 'active', person: 1, number: 'plural' } },
      { verb: 'hap', opts: { mood: 'indicative', tense: 'imperfect', voice: 'active', person: 2, number: 'singular' } },
      { verb: 'pjek', opts: { mood: 'indicative', tense: 'aorist', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'jam', opts: { mood: 'indicative', tense: 'present', voice: 'active', person: 3, number: 'singular' } },
      { verb: 'jam', opts: { mood: 'indicative', tense: 'aorist', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'shoh', opts: { mood: 'indicative', tense: 'perfect', voice: 'active', person: 1, number: 'singular' } },
      { verb: 'laj', opts: { mood: 'indicative', tense: 'aorist', voice: 'middle-passive', person: 1, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'imperative', voice: 'active', person: 2, number: 'singular' } },
      { verb: 'punoj', opts: { mood: 'indicative', tense: 'present', voice: 'active', person: 1, number: 'singular', polarity: 'negative' as const } },
      { verb: 'punoj', opts: { mood: 'indicative', tense: 'present', voice: 'active', person: 2, number: 'singular', modality: 'interrogative' as const } },
    ];
    for (const { verb, opts } of samples) {
      const conj = conjugate(verb, opts);
      const steps = trace(verb, opts);
      const last = steps[steps.length - 1];
      expect(last?.kind).toBe('final');
      if (last?.kind === 'final') {
        expect(last.form).toBe(conj.form);
      }
    }
  });
});
