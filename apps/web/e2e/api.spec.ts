import { expect, test } from '@playwright/test';

test('GET /api/verbs returns the corpus list', async ({ request }) => {
  const res = await request.get('/api/verbs');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.engineVersion).toBeDefined();
  expect(body.corpusVersion).toBeDefined();
  expect(body.cite).toContain('foljapp');
  expect(Array.isArray(body.verbs)).toBe(true);
  expect(body.verbs.length).toBeGreaterThanOrEqual(20);
  for (const v of body.verbs) {
    expect(v.id).toBeDefined();
    expect(v.lemma).toBeDefined();
    expect(v.translationEn).toBeDefined();
    expect([1, 2, 3]).toContain(v.class);
    expect(['kam', 'jam']).toContain(v.auxiliary);
  }
});

test('GET /api/verbs/punoj returns the full conjugation table as JSON', async ({ request }) => {
  const res = await request.get('/api/verbs/punoj');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.entry.lemma).toBe('punoj');
  expect(body.entry.translationEn).toBe('to work');
  expect(body.table.indicative.present['1sg.active'].form).toBe('punoj');
  expect(body.table.admirative.present['1sg.active'].form).toBe('punuakam');
  expect(body.cite).toContain('punoj');
  expect(body.frequency).toBeUndefined();
});

test('GET /api/verbs/mesoj resolves the diacritic lemma by id slug', async ({
  request,
}) => {
  const res = await request.get('/api/verbs/mesoj');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.entry.id).toBe('mesoj');
  expect(body.entry.lemma).toBe('mësoj');
  expect(body.cite).toContain('/api/verbs/mesoj');
});

test('GET /api/verbs/mësoj remains accepted as a lemma alias', async ({
  request,
}) => {
  const res = await request.get('/api/verbs/m%C3%ABsoj');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.entry.id).toBe('mesoj');
  expect(body.entry.lemma).toBe('mësoj');
});

test('GET /api/verbs/punoj?format=igt returns plain-text IGT', async ({ request }) => {
  const res = await request.get('/api/verbs/punoj?format=igt');
  expect(res.status()).toBe(200);
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toContain('text/plain');
  const body = await res.text();
  expect(body).toContain('verb: punoj');
  expect(body).toContain('AUX');
  expect(body).toContain('STEM');
});

test('GET /api/verbs/punoj?format=conllu returns CoNLL-U', async ({ request }) => {
  const res = await request.get('/api/verbs/punoj?format=conllu');
  expect(res.status()).toBe(200);
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toContain('text/plain');
  const body = await res.text();
  expect(body).toContain('# sent_id = punoj');
  expect(body).toContain('Mood=Ind');
});

test('GET /api/verbs/notarealverb returns 404 with JSON error', async ({ request }) => {
  const res = await request.get('/api/verbs/notarealverb');
  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.error).toBe('unknown verb');
  expect(body.lemma).toBe('notarealverb');
});

test('GET /api/openapi.json is a valid OpenAPI 3.1 document', async ({ request }) => {
  const res = await request.get('/api/openapi.json');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.openapi).toMatch(/^3\.1\./);
  expect(body.paths['/api/verbs']).toBeDefined();
  expect(body.paths['/api/verbs/{lemma}']).toBeDefined();
  expect(body.components.schemas.CorpusIndexEntry).toBeDefined();
});

test('GET /api/verbs/jam returns suppletive forms', async ({ request }) => {
  const res = await request.get('/api/verbs/jam');
  const body = await res.json();
  expect(body.table.indicative.present['1sg.active'].form).toBe('jam');
  expect(body.table.indicative.aorist['1sg.active'].form).toBe('qeshë');
});
