/**
 * Patch the next-on-pages `_routes.json` so Cloudflare Pages serves the
 * prebuilt example assets (public/examples/*.json) directly as static
 * files instead of routing them into the Next worker, which 404s paths
 * outside the Next route manifest.
 *
 * Runs as part of `npm run build:pages`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = resolve(
  __dirname,
  '..',
  'apps',
  'web',
  '.cf-pages-output',
  '_routes.json',
);

const STATIC_EXCLUDES = ['/examples/*'];

interface RoutesFile {
  version: number;
  description?: string;
  include: string[];
  exclude: string[];
}

const routes = JSON.parse(readFileSync(ROUTES_PATH, 'utf8')) as RoutesFile;
// Defensive: don't assume next-on-pages always emits an `exclude` array.
routes.exclude ??= [];
for (const pattern of STATIC_EXCLUDES) {
  if (!routes.exclude.includes(pattern)) {
    routes.exclude.push(pattern);
  }
}
writeFileSync(ROUTES_PATH, JSON.stringify(routes, null, 2) + '\n', 'utf8');
console.log(`Patched ${ROUTES_PATH}: exclude = ${routes.exclude.join(', ')}`);
