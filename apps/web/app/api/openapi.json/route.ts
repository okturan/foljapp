import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const document = {
  openapi: '3.1.0',
  info: {
    title: 'foljapp API',
    version: '0.1.0',
    description:
      'Read-only HTTP API surfacing the foljapp Albanian verb corpus and engine output.',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/verbs': {
      get: {
        summary: 'List all corpus verbs',
        responses: {
          '200': {
            description: 'Corpus index with versions and citation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiVerbListResponse' },
              },
            },
          },
        },
      },
    },
    '/api/verbs/{lemma}': {
      get: {
        summary: "Full conjugation table for a single verb",
        parameters: [
          {
            name: 'lemma',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: "URL-encoded Albanian lemma (e.g., 'punoj' or 'b%C3%ABj')",
          },
          {
            name: 'format',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['json', 'igt', 'conllu'] },
            description: 'Response format. Default: json.',
          },
        ],
        responses: {
          '200': {
            description: 'Conjugation table',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiVerbDetailResponse' },
              },
              'text/plain': {
                schema: {
                  type: 'string',
                  description: 'IGT or CoNLL-U format depending on ?format=',
                },
              },
            },
          },
          '404': {
            description: 'Unknown lemma',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CorpusIndexEntry: {
        type: 'object',
        required: ['id', 'lemma', 'translationEn', 'class', 'auxiliary'],
        properties: {
          id: { type: 'string' },
          lemma: { type: 'string' },
          translationEn: { type: 'string' },
          class: { type: 'integer', enum: [1, 2, 3] },
          auxiliary: { type: 'string', enum: ['kam', 'jam'] },
        },
      },
      ApiVerbListResponse: {
        type: 'object',
        required: ['engineVersion', 'corpusVersion', 'cite', 'verbs'],
        properties: {
          engineVersion: { type: 'string' },
          corpusVersion: { type: 'string' },
          cite: { type: 'string' },
          verbs: {
            type: 'array',
            items: { $ref: '#/components/schemas/CorpusIndexEntry' },
          },
        },
      },
      ApiVerbDetailResponse: {
        type: 'object',
        required: ['engineVersion', 'corpusVersion', 'cite', 'entry', 'table'],
        properties: {
          engineVersion: { type: 'string' },
          corpusVersion: { type: 'string' },
          cite: { type: 'string' },
          entry: { type: 'object' },
          table: { type: 'object' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          lemma: { type: 'string' },
        },
      },
    },
  },
} as const;

export function GET() {
  return NextResponse.json(document);
}
