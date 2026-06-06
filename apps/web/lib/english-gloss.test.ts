import type { VerbEntry } from '@foljapp/engine';
import { describe, expect, it } from 'vitest';

import { applyVoiceTransform, auxForm, beForm, englishGloss, pronoun } from './english-gloss';

const punoj: VerbEntry = {
  id: 'punoj',
  lemma: 'punoj',
  translationEn: 'to work',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'puno', aorist: 'punua', participle: 'punuar' },
  sources: [{ source: 'manual', reference: 'test' }],
};

const jam: VerbEntry = {
  id: 'jam',
  lemma: 'jam',
  translationEn: 'to be',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'jam', aorist: 'qe', participle: 'qenë' },
  sources: [{ source: 'manual', reference: 'test' }],
  englishForms: {
    base: 'be',
    past: 'was',
    participle: 'been',
    gerund: 'being',
  },
};

const shoh: VerbEntry = {
  id: 'shoh',
  lemma: 'shoh',
  translationEn: 'to see',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'sho', aorist: 'pa', participle: 'parë' },
  sources: [{ source: 'manual', reference: 'test' }],
};

const pjek: VerbEntry = {
  id: 'pjek',
  lemma: 'pjek',
  translationEn: 'to bake / to roast',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'pjek', aorist: 'poq', participle: 'pjekur' },
  sources: [{ source: 'manual', reference: 'test' }],
};

const djeg: VerbEntry = {
  id: 'djeg',
  lemma: 'djeg',
  translationEn: 'to burn',
  class: 2,
  auxiliary: 'kam',
  principalParts: { present: 'djeg', aorist: 'dogj', participle: 'djegur' },
  sources: [{ source: 'manual', reference: 'test' }],
};

const kerkoj: VerbEntry = {
  id: 'kerkoj',
  lemma: 'kërkoj',
  translationEn: 'to look for / to ask',
  class: 1,
  auxiliary: 'kam',
  principalParts: { present: 'kërko', aorist: 'kërkua', participle: 'kërkuar' },
  sources: [{ source: 'manual', reference: 'test' }],
};

describe('pronoun', () => {
  it('1sg → I, 1pl → we', () => {
    expect(pronoun(1, 'singular')).toBe('I');
    expect(pronoun(1, 'plural')).toBe('we');
  });
  it('2sg = 2pl = you', () => {
    expect(pronoun(2, 'singular')).toBe('you');
    expect(pronoun(2, 'plural')).toBe('you');
  });
  it('3sg → s/he, 3pl → they', () => {
    expect(pronoun(3, 'singular')).toBe('s/he');
    expect(pronoun(3, 'plural')).toBe('they');
  });
});

describe('beForm', () => {
  it('present: I am, you are, s/he is', () => {
    expect(beForm(1, 'singular', 'present')).toBe('am');
    expect(beForm(2, 'singular', 'present')).toBe('are');
    expect(beForm(3, 'singular', 'present')).toBe('is');
    expect(beForm(1, 'plural', 'present')).toBe('are');
  });
  it('past: I was, we were', () => {
    expect(beForm(1, 'singular', 'past')).toBe('was');
    expect(beForm(3, 'singular', 'past')).toBe('was');
    expect(beForm(1, 'plural', 'past')).toBe('were');
    expect(beForm(2, 'plural', 'past')).toBe('were');
  });
});

describe('auxForm', () => {
  it('resolves was/were', () => {
    expect(auxForm('was/were', 1, 'singular')).toBe('was');
    expect(auxForm('was/were', 1, 'plural')).toBe('were');
  });
  it('resolves have/has', () => {
    expect(auxForm('have/has', 3, 'singular')).toBe('has');
    expect(auxForm('have/has', 1, 'singular')).toBe('have');
  });
  it('resolves multi-word: was/were going to', () => {
    expect(auxForm('was/were going to', 1, 'singular')).toBe('was going to');
    expect(auxForm('was/were going to', 1, 'plural')).toBe('were going to');
  });
  it('passes through non-slash auxes', () => {
    expect(auxForm('will have', 3, 'singular')).toBe('will have');
    expect(auxForm('would', 1, 'singular')).toBe('would');
  });
});

describe('applyVoiceTransform', () => {
  it('simple base → am/are/is + participle', () => {
    const t = applyVoiceTransform(
      { aux: '', verbForm: 'base' },
      'indicative',
    );
    expect(t.aux).toBe('am/are/is');
    expect(t.verbForm).toBe('participle');
  });
  it('imperative MP uses "be"', () => {
    const t = applyVoiceTransform(
      { aux: '', verbForm: 'base', noPronoun: true, suffix: '!' },
      'imperative',
    );
    expect(t.aux).toBe('be');
    expect(t.verbForm).toBe('participle');
  });
  it('simple past → was/were + participle', () => {
    const t = applyVoiceTransform(
      { aux: '', verbForm: 'past' },
      'indicative',
    );
    expect(t.aux).toBe('was/were');
  });
  it('have/has + participle → have/has been + participle', () => {
    const t = applyVoiceTransform(
      { aux: 'have/has', verbForm: 'participle' },
      'indicative',
    );
    expect(t.aux).toBe('have/has been');
  });
  it('was/were + gerund → was/were being + participle', () => {
    const t = applyVoiceTransform(
      { aux: 'was/were', verbForm: 'gerund' },
      'indicative',
    );
    expect(t.aux).toBe('was/were being');
    expect(t.verbForm).toBe('participle');
  });
  it('will + base → will be + participle', () => {
    const t = applyVoiceTransform(
      { aux: 'will', verbForm: 'base' },
      'indicative',
    );
    expect(t.aux).toBe('will be');
  });
  it('would have + participle → would have been + participle', () => {
    const t = applyVoiceTransform(
      { aux: 'would have', verbForm: 'participle' },
      'indicative',
    );
    expect(t.aux).toBe('would have been');
  });
});

describe('englishGloss — indicative active', () => {
  it('present 1sg: I work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I work');
  });
  it('aorist 3sg: s/he worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he worked');
  });
  it('perfect 1sg: I have worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have worked');
  });
  it('perfect 3sg: s/he has worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he has worked');
  });
  it('pluperfect 1sg: I had worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'pluperfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I had worked');
  });
  it('future 1sg: I will work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I will work');
  });
  it('future-perfect 1sg: I will have worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future-perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I will have worked');
  });
  it('future-in-past 1sg: I was going to work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future-in-past',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was going to work');
  });
  it('future-in-past 1pl: we were going to work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future-in-past',
        voice: 'active',
        person: 1,
        number: 'plural',
      }),
    ).toBe('we were going to work');
  });
  it('imperfect 1sg: I was working', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'imperfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was working');
  });
});

describe('englishGloss — conditional, subjunctive, admirative, optative, imperative', () => {
  it('conditional present 1sg: I would work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'conditional',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I would work');
  });
  it('conditional perfect 1sg: I would have worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'conditional',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I would have worked');
  });
  it('subjunctive present 1sg: (that) I work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'subjunctive',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('(that) I work');
  });
  it('admirative present 1sg: I apparently work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'admirative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I apparently work');
  });
  it('admirative imperfect 1sg: I apparently was working', () => {
    expect(
      englishGloss(punoj, {
        mood: 'admirative',
        tense: 'imperfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I apparently was working');
  });
  it('admirative pluperfect 1sg: I apparently had worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'admirative',
        tense: 'pluperfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I apparently had worked');
  });
  it('optative present 1sg: may I work (inverted)', () => {
    expect(
      englishGloss(punoj, {
        mood: 'optative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('may I work');
  });
  it('optative perfect 1sg: may I have worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'optative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('may I have worked');
  });
  it('imperative 2sg: work!', () => {
    expect(
      englishGloss(punoj, {
        mood: 'imperative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'singular',
      }),
    ).toBe('work!');
  });
});

describe('englishGloss — negation (do-support and aux-internal)', () => {
  it('present negative: I do not work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I do not work');
  });
  it('present 3sg negative: s/he does not work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 3,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('s/he does not work');
  });
  it('aorist negative: I did not work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I did not work');
  });
  it('perfect negative: I have not worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I have not worked');
  });
  it('future negative: I will not work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I will not work');
  });
  it('conditional present negative: I would not work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'conditional',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I would not work');
  });
  it('imperative negative: do not work!', () => {
    expect(
      englishGloss(punoj, {
        mood: 'imperative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('do not work!');
  });
});

describe('englishGloss — interrogative inversion', () => {
  it('present interrogative: do I work?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('do I work?');
  });
  it('perfect interrogative: have I worked?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('have I worked?');
  });
  it('future interrogative: will I work?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future',
        voice: 'active',
        person: 1,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('will I work?');
  });
  it('aorist interrogative: did I work?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('did I work?');
  });
  it('negative + interrogative compose: have I not worked?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
        modality: 'interrogative',
      }),
    ).toBe('have I not worked?');
  });
  it('negative simple present interrogative: do I not work?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
        modality: 'interrogative',
      }),
    ).toBe('do I not work?');
  });
});

describe('englishGloss — middle-passive voice', () => {
  it('present MP 1sg: I am worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I am worked');
  });
  it('imperfect MP 1sg: I was being worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'imperfect',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was being worked');
  });
  it('perfect MP 1sg: I have been worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have been worked');
  });
  it('future MP 1sg: I will be worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I will be worked');
  });
  it('conditional perfect MP 1sg: I would have been worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'conditional',
        tense: 'perfect',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I would have been worked');
  });
  it('admirative present MP 1sg: I apparently am worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'admirative',
        tense: 'present',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I apparently am worked');
  });
  it('aorist MP 1sg: I was worked', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was worked');
  });
  it('passive negative + interrogative: have I not been worked?', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
        polarity: 'negative',
        modality: 'interrogative',
      }),
    ).toBe('have I not been worked?');
  });
});

describe('englishGloss — suppletive overrides', () => {
  it('jam present 1sg: I am (uses be-form, not "I be")', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I am');
  });
  it('jam present 3sg: s/he is', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he is');
  });
  it('jam aorist 1sg: I was', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was');
  });
  it('jam aorist 1pl: we were', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'plural',
      }),
    ).toBe('we were');
  });
  it('jam future 1sg: I will be (modal aux uses bare "be")', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'future',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I will be');
  });
  it('jam perfect 1sg: I have been', () => {
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have been');
  });
  it('jam imperfect 1sg: I was being (gerund + was/were)', () => {
    // imperfect template is { aux: was/were, verbForm: gerund }
    // → "I was being" (using gerund form "being")
    expect(
      englishGloss(jam, {
        mood: 'indicative',
        tense: 'imperfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was being');
  });
  it('shoh aorist 1sg: I saw (registry hit)', () => {
    expect(
      englishGloss(shoh, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I saw');
  });
  it('shoh perfect 1sg: I have seen (registry hit)', () => {
    expect(
      englishGloss(shoh, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have seen');
  });
});

describe('englishGloss — phonological-mutating verbs use English regular forms', () => {
  it('pjek aorist 1sg: I baked (regular English)', () => {
    expect(
      englishGloss(pjek, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I baked');
  });
  it('djeg aorist 1sg: I burned', () => {
    expect(
      englishGloss(djeg, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I burned');
  });
});

describe('englishGloss — multi-sense first-pick + phrasal verbs', () => {
  it('kërkoj present 1sg uses first sense "look for"', () => {
    expect(
      englishGloss(kerkoj, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I look for');
  });
  it('kërkoj perfect 1sg: I have looked for', () => {
    expect(
      englishGloss(kerkoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have looked for');
  });
});

describe('englishGloss — non-finite forms', () => {
  it('participle: worked', () => {
    expect(
      englishGloss(punoj, { mood: 'non-finite', form: 'participle' }),
    ).toBe('worked');
  });
  it('infinitive: to work', () => {
    expect(
      englishGloss(punoj, { mood: 'non-finite', form: 'infinitive' }),
    ).toBe('to work');
  });
  it('gerund: working', () => {
    expect(
      englishGloss(punoj, { mood: 'non-finite', form: 'gerund' }),
    ).toBe('working');
  });
  it('privative: without working', () => {
    expect(
      englishGloss(punoj, { mood: 'non-finite', form: 'privative' }),
    ).toBe('without working');
  });
  it('temporal: upon working', () => {
    expect(
      englishGloss(punoj, { mood: 'non-finite', form: 'temporal' }),
    ).toBe('upon working');
  });
});

describe('englishGloss — be-compound (lind "to be born", mund "to be able")', () => {
  const lind: VerbEntry = {
    id: 'lind',
    lemma: 'lind',
    translationEn: 'to be born',
    class: 2,
    auxiliary: 'kam',
    principalParts: { present: 'lind', aorist: 'lind', participle: 'lindur' },
    sources: [{ source: 'manual', reference: 'test' }],
    englishForms: {
      base: 'be born',
      past: 'was born',
      participle: 'been born',
      gerund: 'being born',
    },
  };
  const mund: VerbEntry = {
    id: 'mund',
    lemma: 'mund',
    translationEn: 'to be able / can',
    class: 2,
    auxiliary: 'kam',
    principalParts: { present: 'mund', aorist: 'mund', participle: 'mundur' },
    sources: [{ source: 'manual', reference: 'test' }],
    englishForms: {
      base: 'be able',
      past: 'was able',
      participle: 'been able',
      gerund: 'being able',
    },
  };

  it('lind present 1sg: I am born', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I am born');
  });
  it('lind present 1pl: we are born', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'plural',
      }),
    ).toBe('we are born');
  });
  it('lind aorist 1sg: I was born', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I was born');
  });
  it('lind aorist 1pl: we were born (be-virtualization handles agreement)', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'plural',
      }),
    ).toBe('we were born');
  });
  it('lind perfect 1sg: I have been born', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have been born');
  });
  it('lind future 1sg: I will be born (modal aux)', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'future',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I will be born');
  });
  it('lind present negative: I am not born (be acts as aux)', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I am not born');
  });
  it('lind aorist negative: I was not born', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 1,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('I was not born');
  });
  it('lind present interrogative: am I born?', () => {
    expect(
      englishGloss(lind, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('am I born?');
  });
  it('mund present 1sg: I am able', () => {
    expect(
      englishGloss(mund, {
        mood: 'indicative',
        tense: 'present',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I am able');
  });
  it('mund aorist 3sg: s/he was able', () => {
    expect(
      englishGloss(mund, {
        mood: 'indicative',
        tense: 'aorist',
        voice: 'active',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he was able');
  });
});

describe('englishGloss — extended irregulars registry hits', () => {
  const tregoj: VerbEntry = {
    id: 'tregoj',
    lemma: 'tregoj',
    translationEn: 'to tell / to show',
    class: 1,
    auxiliary: 'kam',
    principalParts: { present: 'trego', aorist: 'tregua', participle: 'treguar' },
    sources: [{ source: 'manual', reference: 'test' }],
  };
  const qendroj: VerbEntry = {
    id: 'qendroj',
    lemma: 'qëndroj',
    translationEn: 'to stand / to remain',
    class: 1,
    auxiliary: 'kam',
    principalParts: { present: 'qëndro', aorist: 'qëndrua', participle: 'qëndruar' },
    sources: [{ source: 'manual', reference: 'test' }],
  };
  const dergoj: VerbEntry = {
    id: 'dergoj',
    lemma: 'dërgoj',
    translationEn: 'to send',
    class: 1,
    auxiliary: 'kam',
    principalParts: { present: 'dërgo', aorist: 'dërgua', participle: 'dërguar' },
    sources: [{ source: 'manual', reference: 'test' }],
  };

  it('tregoj (tell) conditional perfect: would we have told?', () => {
    expect(
      englishGloss(tregoj, {
        mood: 'conditional',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'plural',
        modality: 'interrogative',
      }),
    ).toBe('would we have told?');
  });
  it('qëndroj (stand) conditional perfect MP: s/he would have been stood', () => {
    expect(
      englishGloss(qendroj, {
        mood: 'conditional',
        tense: 'perfect',
        voice: 'middle-passive',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he would have been stood');
  });
  it('dërgoj (send) perfect 1sg: I have sent', () => {
    expect(
      englishGloss(dergoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I have sent');
  });
});

describe('englishGloss — be-compound MP collapses to active', () => {
  const lind: VerbEntry = {
    id: 'lind',
    lemma: 'lind',
    translationEn: 'to be born',
    class: 2,
    auxiliary: 'kam',
    principalParts: { present: 'lind', aorist: 'lind', participle: 'lindur' },
    sources: [{ source: 'manual', reference: 'test' }],
    englishForms: {
      base: 'be born',
      past: 'was born',
      participle: 'been born',
      gerund: 'being born',
    },
  };
  const mund: VerbEntry = {
    id: 'mund',
    lemma: 'mund',
    translationEn: 'to be able / can',
    class: 2,
    auxiliary: 'kam',
    principalParts: { present: 'mund', aorist: 'mund', participle: 'mundur' },
    sources: [{ source: 'manual', reference: 'test' }],
    englishForms: {
      base: 'be able',
      past: 'was able',
      participle: 'been able',
      gerund: 'being able',
    },
  };

  it('lind conditional present MP collapses to active "I would be born"', () => {
    expect(
      englishGloss(lind, {
        mood: 'conditional',
        tense: 'present',
        voice: 'middle-passive',
        person: 1,
        number: 'singular',
      }),
    ).toBe('I would be born');
  });
  it('mund conditional perfect MP interrogative collapses correctly', () => {
    expect(
      englishGloss(mund, {
        mood: 'conditional',
        tense: 'perfect',
        voice: 'middle-passive',
        person: 3,
        number: 'singular',
        modality: 'interrogative',
      }),
    ).toBe('would s/he have been able?');
  });
  it('mund imperative 2pl negative uses bare "be" not "are"', () => {
    expect(
      englishGloss(mund, {
        mood: 'imperative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'plural',
        polarity: 'negative',
      }),
    ).toBe('do not be able!');
  });
  it('mund imperative 2sg affirmative: "be able!"', () => {
    expect(
      englishGloss(mund, {
        mood: 'imperative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'singular',
      }),
    ).toBe('be able!');
  });
  it('jam imperative 2sg negative: "do not be!"', () => {
    expect(
      englishGloss(jam, {
        mood: 'imperative',
        tense: 'present',
        voice: 'active',
        person: 2,
        number: 'singular',
        polarity: 'negative',
      }),
    ).toBe('do not be!');
  });
});

describe('englishGloss — agreement edge cases', () => {
  it('3sg present perfect uses "has"', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 3,
        number: 'singular',
      }),
    ).toBe('s/he has worked');
  });
  it('3pl present perfect uses "have"', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'perfect',
        voice: 'active',
        person: 3,
        number: 'plural',
      }),
    ).toBe('they have worked');
  });
  it('1pl future-in-past: we were going to work', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'future-in-past',
        voice: 'active',
        person: 1,
        number: 'plural',
      }),
    ).toBe('we were going to work');
  });
  it('2pl imperfect: you were working', () => {
    expect(
      englishGloss(punoj, {
        mood: 'indicative',
        tense: 'imperfect',
        voice: 'active',
        person: 2,
        number: 'plural',
      }),
    ).toBe('you were working');
  });
});
