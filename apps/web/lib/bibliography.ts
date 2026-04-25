/**
 * Bibliography data + BibTeX emitters.
 *
 * Hand-authored. Editing this file is a PR.
 */

import type { VerbEntry } from '@foljapp/engine';

export interface Source {
  id: string;
  type: 'book' | 'article' | 'inproceedings' | 'misc' | 'software';
  title: string;
  authors: string[];
  year: string;
  publisher?: string;
  journal?: string;
  booktitle?: string;
  url?: string;
  note?: string;
}

export const BIBLIOGRAPHY: Source[] = [
  {
    id: 'husic-2002',
    type: 'book',
    title: 'Albanian Verb Dictionary and Manual',
    authors: ['Geoff Husić'],
    year: '2002',
    publisher: 'University of Kansas Libraries',
    url: 'https://juristat.wordpress.com/wp-content/uploads/2012/02/10-albanian-verb-dictionary-and-manual.pdf',
  },
  {
    id: 'kadriu-2015',
    type: 'inproceedings',
    title:
      'Computational Modeling of Morphology in Albanian Language: The Case of Verbs',
    authors: ['Adem Kadriu'],
    year: '2015',
    booktitle:
      'Proceedings of the International Conference ICT for Language Learning',
    url: 'https://conference.pixel-online.net/files/ict4ll/ed0015/FP/8039-ICT5761-FP-ICT4LL15.pdf',
  },
  {
    id: 'uniparser-albanian',
    type: 'software',
    title: 'uniparser-grammar-albanian',
    authors: ['Timofey Arkhangelskiy'],
    year: '2021',
    url: 'https://github.com/timarkh/uniparser-grammar-albanian',
    note: 'Rule-based morphological analyzer for Albanian',
  },
  {
    id: 'kaikki-albanian',
    type: 'misc',
    title: 'Albanian dictionary on Kaikki.org',
    authors: ['Kaikki contributors', 'Wiktionary contributors'],
    year: '2024',
    url: 'https://kaikki.org/dictionary/Albanian/',
    note: 'Machine-readable Wiktionary dictionary export',
  },
  {
    id: 'ud-albanian-tsa',
    type: 'inproceedings',
    title: 'Universal Dependencies Treebank for Standard Albanian: A New Approach',
    authors: ['Marsida Toska'],
    year: '2024',
    booktitle: 'Proceedings of the 6th International Conference on Computational Linguistics in Bulgaria (CLIB 2024)',
    url: 'https://github.com/UniversalDependencies/UD_Albanian-TSA',
  },
  {
    id: 'ud-albanian-staf',
    type: 'misc',
    title: 'UD_Albanian-STAF (Saarbruecken Treebank of Albanian Fiction)',
    authors: ['UD contributors'],
    year: '2024',
    url: 'https://github.com/UniversalDependencies/UD_Albanian-STAF',
  },
  {
    id: 'kote-biba-2019',
    type: 'article',
    title:
      'Morphological Tagging and Lemmatization of Albanian: A Manually Annotated Corpus and Neural Models',
    authors: ['Nelda Kote', 'Marenglen Biba'],
    year: '2019',
    journal: 'arXiv preprint arXiv:1912.00991',
    url: 'https://arxiv.org/abs/1912.00991',
  },
  {
    id: 'newmark-hubbard-prifti',
    type: 'book',
    title: 'Standard Albanian: A Reference Grammar for Students',
    authors: ['Leonard Newmark', 'Philip Hubbard', 'Peter Prifti'],
    year: '1982',
    publisher: 'Stanford University Press',
  },
  {
    id: 'wikipedia-albanian-morphology',
    type: 'misc',
    title: 'Albanian morphology — Wikipedia',
    authors: ['Wikipedia contributors'],
    year: '2026',
    url: 'https://en.wikipedia.org/wiki/Albanian_morphology',
  },
];

function escapeBibtex(s: string): string {
  // Minimal LaTeX-escape: only handle the apostrophe / accents that occur
  // in our authors. Husić → Husi{\'c}.
  return s.replace(/ć/g, "{\\'c}").replace(/ë/g, "{\\\"e}");
}

function joinAuthors(authors: string[]): string {
  return authors.map(escapeBibtex).join(' and ');
}

export function bibtexForSource(s: Source): string {
  const fields: string[] = [];
  fields.push(`  title = {${escapeBibtex(s.title)}}`);
  fields.push(`  author = {${joinAuthors(s.authors)}}`);
  fields.push(`  year = {${s.year}}`);
  if (s.publisher) fields.push(`  publisher = {${escapeBibtex(s.publisher)}}`);
  if (s.journal) fields.push(`  journal = {${escapeBibtex(s.journal)}}`);
  if (s.booktitle) fields.push(`  booktitle = {${escapeBibtex(s.booktitle)}}`);
  if (s.url) fields.push(`  url = {${s.url}}`);
  if (s.note) fields.push(`  note = {${escapeBibtex(s.note)}}`);
  return `@${s.type}{${s.id},\n${fields.join(',\n')}\n}`;
}

export function bibtexForVerb(entry: VerbEntry, lemmaUrl: string): string {
  const id = `foljapp-${entry.id}-${new Date().getFullYear()}`;
  const lines = [
    `  title = {${escapeBibtex(entry.lemma)} — ${escapeBibtex(entry.translationEn)}}`,
    `  author = {{foljapp contributors}}`,
    `  year = {${new Date().getFullYear()}}`,
    `  url = {${lemmaUrl}}`,
    `  howpublished = {foljapp Albanian verbal system reference}`,
  ];
  return `@misc{${id},\n${lines.join(',\n')}\n}`;
}

export function bibtexForEngine(
  engineVersion: string,
  corpusVersion: string,
): string {
  const id = `foljapp-${new Date().getFullYear()}`;
  const lines = [
    `  title = {foljapp — Albanian verbal system reference}`,
    `  author = {{foljapp contributors}}`,
    `  year = {${new Date().getFullYear()}}`,
    `  version = {engine-${engineVersion} corpus-${corpusVersion}}`,
    `  url = {https://github.com/okturan/foljapp}`,
  ];
  return `@software{${id},\n${lines.join(',\n')}\n}`;
}

export function apaForVerb(entry: VerbEntry, lemmaUrl: string): string {
  const year = new Date().getFullYear();
  return `foljapp contributors. (${year}). ${entry.lemma} — ${entry.translationEn}. foljapp Albanian verbal system reference. ${lemmaUrl}`;
}

export function plainForVerb(entry: VerbEntry, lemmaUrl: string): string {
  return `foljapp · ${entry.lemma} (${entry.translationEn}) · ${lemmaUrl}`;
}
