/**
 * Unit tests for the markdown-table format parser of Husić verification
 * source data. Fabricated input only — no real Husić data committed
 * (per copyright; see packages/engine/docs/husic-format.md).
 */

import { describe, expect, it } from 'vitest';

import { mapHusicLabelToTags, parseMarkdownTables } from '../../../scripts/parse-husic';

describe('mapHusicLabelToTags', () => {
  it('maps "dëftore — e tashme" to indicative + present', () => {
    const tags = mapHusicLabelToTags('dëftore — e tashme', { person: 1, number: 'singular' });
    expect(tags).toContain('indicative');
    expect(tags).toContain('present');
    expect(tags).toContain('first-person');
    expect(tags).toContain('singular');
  });

  it('maps "më se e kryer" to past + perfect (Kaikki convention for pluperfect)', () => {
    const tags = mapHusicLabelToTags('dëftore — më se e kryer', { person: 3, number: 'plural' });
    expect(tags).toContain('past');
    expect(tags).toContain('perfect');
    expect(tags).toContain('third-person');
    expect(tags).toContain('plural');
    expect(tags).not.toContain('pluperfect');
  });

  it('maps "habitore — e pakryer" to admirative + imperfect', () => {
    const tags = mapHusicLabelToTags('habitore — e pakryer', { person: 1, number: 'singular' });
    expect(tags).toContain('admirative');
    expect(tags).toContain('imperfect');
  });

  it('maps "kushtore — e tashme" to conditional + present', () => {
    // Note: Kaikki tags conditional present as "imperfect" (verb-form-based);
    // but our husic mapper emits the construction label. verify-engine's
    // tagsFor for conditional present already adds 'imperfect', so the
    // findKaikkiForm filter still matches.
    const tags = mapHusicLabelToTags('kushtore — e tashme', { person: 1, number: 'singular' });
    expect(tags).toContain('conditional');
    expect(tags).toContain('present');
  });

  it('maps "joveprore" voice marker to middle-passive tag', () => {
    const tags = mapHusicLabelToTags('dëftore — e tashme — joveprore', { person: 3, number: 'singular' });
    expect(tags).toContain('middle-passive');
  });

  it('omits explicit active tag when veprore is present', () => {
    const tags = mapHusicLabelToTags('dëftore — e tashme — veprore', { person: 1, number: 'singular' });
    expect(tags).not.toContain('active');
    expect(tags).not.toContain('middle-passive');
  });

  it('maps future-perfect to future + perfect', () => {
    const tags = mapHusicLabelToTags('dëftore — e ardhme e përparme', { person: 1, number: 'singular' });
    expect(tags).toContain('future');
    expect(tags).toContain('perfect');
  });

  it('maps past-anterior to past-anterior (single tag)', () => {
    const tags = mapHusicLabelToTags('dëftore — e kryer e tejshkuar', { person: 1, number: 'singular' });
    expect(tags).toContain('past-anterior');
  });
});

describe('parseMarkdownTables', () => {
  it('parses a single verb with one paradigm', () => {
    const source = `
## punoj: punoj

### dëftore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | punoj | punojmë |
| 2 | punon | punoni |
| 3 | punon | punojnë |
`;
    const result = parseMarkdownTables(source);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('punoj');
    expect(result[0]?.lemma).toBe('punoj');
    expect(result[0]?.forms).toHaveLength(6);
    expect(result[0]?.forms[0]?.form).toBe('punoj');
    expect(result[0]?.forms[0]?.tags).toContain('indicative');
    expect(result[0]?.forms[0]?.tags).toContain('present');
    expect(result[0]?.forms[0]?.tags).toContain('first-person');
    expect(result[0]?.forms[0]?.tags).toContain('singular');
  });

  it('skips empty cells (— and -)', () => {
    const source = `
## punoj: punoj

### urdhërore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | — | — |
| 2 | puno | punoni |
| 3 | - | - |
`;
    const result = parseMarkdownTables(source);
    expect(result[0]?.forms).toHaveLength(2);
    expect(result[0]?.forms.map((f) => f.form)).toEqual(['puno', 'punoni']);
  });

  it('parses multiple verbs in one source', () => {
    const source = `
## punoj: punoj

### dëftore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | punoj | punojmë |
| 2 | punon | punoni |
| 3 | punon | punojnë |

## flas: flas

### dëftore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | flas | flasim |
| 2 | flet | flisni |
| 3 | flet | flasin |
`;
    const result = parseMarkdownTables(source);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('punoj');
    expect(result[1]?.id).toBe('flas');
    expect(result[0]?.forms).toHaveLength(6);
    expect(result[1]?.forms).toHaveLength(6);
  });

  it('parses multiple paradigms per verb', () => {
    const source = `
## punoj: punoj

### dëftore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | punoj | punojmë |
| 2 | punon | punoni |
| 3 | punon | punojnë |

### dëftore — e pakryer

|  | sg | pl |
|--|----|----|
| 1 | punoja | punonim |
| 2 | punoje | punonit |
| 3 | punonte | punonin |
`;
    const result = parseMarkdownTables(source);
    expect(result[0]?.forms).toHaveLength(12);
    const present1sg = result[0]?.forms.find((f) => f.tags.includes('present') && f.tags.includes('first-person') && f.tags.includes('singular'));
    expect(present1sg?.form).toBe('punoj');
    const imperfect1sg = result[0]?.forms.find((f) => f.tags.includes('imperfect') && f.tags.includes('first-person') && f.tags.includes('singular'));
    expect(imperfect1sg?.form).toBe('punoja');
  });

  it('returns empty array for empty input', () => {
    expect(parseMarkdownTables('')).toEqual([]);
  });

  it('ignores text outside H2/H3/table structure', () => {
    const source = `
Some prose introduction.

## punoj: punoj

Some notes about the verb.

### dëftore — e tashme

|  | sg | pl |
|--|----|----|
| 1 | punoj | punojmë |

Trailing prose.
`;
    const result = parseMarkdownTables(source);
    expect(result).toHaveLength(1);
    expect(result[0]?.forms.map((f) => f.form)).toEqual(['punoj', 'punojmë']);
  });
});
