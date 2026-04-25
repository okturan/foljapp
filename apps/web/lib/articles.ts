/**
 * Article registry. Build-time scan of apps/web/app/articles/<slug>/page.mdx
 * files. Each .mdx exports a `metadata` constant validated by Zod.
 */

import { z } from 'zod';

export const articleMetadataSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  summary: z.string().min(1),
  category: z.enum(['mood', 'tense', 'classes', 'phonology', 'meta']),
  published: z.boolean(),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'updatedAt must be ISO8601'),
});

export type ArticleMetadata = z.output<typeof articleMetadataSchema>;

import * as adm from '@/app/articles/admirative-mood/page.mdx';
import * as cls from '@/app/articles/verb-classes/page.mdx';

const ARTICLE_MODULES = [adm, cls] as unknown as Array<{ metadata: unknown }>;

let cached: ArticleMetadata[] | null = null;

export function getArticles(): ArticleMetadata[] {
  if (cached) return cached;
  const list: ArticleMetadata[] = [];
  for (const mod of ARTICLE_MODULES) {
    const parsed = articleMetadataSchema.parse(mod.metadata);
    if (parsed.published) list.push(parsed);
  }
  list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  cached = list;
  return list;
}
