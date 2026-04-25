/**
 * Error-handling tests.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
  configure,
  conjugate,
  EngineError,
  InvalidOptionsError,
  UnknownVerbError,
  UnsupportedCellError,
} from '../src/index.js';

import { fixtures } from './fixtures.js';

beforeAll(() => {
  configure(fixtures, '0.1.0');
});

describe('typed errors', () => {
  it('UnknownVerbError on missing verbId', () => {
    expect(() =>
      conjugate('xyznotaverb', {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toThrow(UnknownVerbError);
  });

  it('UnknownVerbError carries the offending id', () => {
    try {
      conjugate('xyznotaverb', {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(UnknownVerbError);
      expect(err).toBeInstanceOf(EngineError);
      expect((err as UnknownVerbError).verbId).toBe('xyznotaverb');
      expect((err as Error).message).toContain('xyznotaverb');
    }
  });

  it('UnsupportedCellError on imperative 1sg', () => {
    expect(() =>
      conjugate('punoj', {
        mood: 'imperative',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toThrow(UnsupportedCellError);
  });

  it('InvalidOptionsError on imperative + future', () => {
    expect(() =>
      conjugate('punoj', {
        mood: 'imperative',
        tense: 'future' as never,
        voice: 'active',
        person: 2,
        number: 'singular',
      }),
    ).toThrow(InvalidOptionsError);
  });

  it('InvalidOptionsError when mood is missing', () => {
    expect(() =>
      conjugate('punoj', {} as never),
    ).toThrow(InvalidOptionsError);
  });

  it('InvalidOptionsError on non-finite without form', () => {
    expect(() =>
      conjugate('punoj', { mood: 'non-finite' } as never),
    ).toThrow(InvalidOptionsError);
  });
});
