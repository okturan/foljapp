/**
 * Download OPUS Albanian-English parallel corpora for local indexing.
 *
 * This script intentionally writes under `.cache/datasets`, which is ignored by
 * git. It is meant for local/offline corpus work, not for bundling raw corpora
 * into the web app.
 *
 * Run:
 *   npx tsx scripts/download-opus-corpora.ts
 */

import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DATASET_ROOT = join(REPO_ROOT, '.cache', 'datasets');
const OPUS_ROOT = join(DATASET_ROOT, 'opus', 'en-sq', 'moses', 'latest');
const ZIP_DIR = join(OPUS_ROOT, 'zips');
const MANIFEST_PATH = join(OPUS_ROOT, 'manifest.json');
const API_URL =
  'https://opus.nlpl.eu/opusapi?source=sq&target=en&preprocessing=moses&version=latest';

interface OpusApiCorpus {
  alignment_pairs?: number | string;
  corpus: string;
  documents?: string;
  id: number;
  latest: string;
  preprocessing: string;
  size: number;
  source: string;
  source_tokens: number;
  target: string;
  target_tokens: number;
  url: string;
  version: string;
}

interface OpusApiResponse {
  corpora?: OpusApiCorpus[];
}

interface DownloadRecord extends OpusApiCorpus {
  localPath: string;
  downloadedBytes: number;
  downloadedAt: string | null;
  sha256: string | null;
  status: 'pending' | 'downloaded';
}

interface Manifest {
  generatedAt: string;
  apiUrl: string;
  datasetRoot: string;
  totalCompressedKiB: number;
  totalAlignmentPairs: number;
  corpora: DownloadRecord[];
}

function safeName(row: OpusApiCorpus): string {
  return `${row.corpus}-${row.version}.zip`.replace(/[^a-z0-9._-]+/gi, '_');
}

function formatBytes(bytes: number): string {
  const mib = bytes / 1024 / 1024;
  if (mib >= 1024) return `${(mib / 1024).toFixed(2)} GiB`;
  if (mib >= 1) return `${mib.toFixed(1)} MiB`;
  return `${Math.round(bytes / 1024)} KiB`;
}

function alignmentPairs(row: OpusApiCorpus): number {
  const raw = row.alignment_pairs;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.length > 0) return Number(raw);
  return 0;
}

async function fetchManifestRows(): Promise<OpusApiCorpus[]> {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(
      `OPUS API failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as OpusApiResponse;
  const rows = payload.corpora ?? [];
  return rows.sort((a, b) => a.corpus.localeCompare(b.corpus));
}

async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function download(url: string, path: string): Promise<void> {
  const partialPath = `${path}.partial`;
  const existing = existsSync(partialPath) ? statSync(partialPath).size : 0;
  const headers: HeadersInit =
    existing > 0 ? { Range: `bytes=${existing}-` } : {};

  const response = await fetch(url, { headers });
  if (!response.ok && response.status !== 206) {
    throw new Error(`download failed ${response.status}: ${url}`);
  }

  const append = existing > 0 && response.status === 206;
  const stream = createWriteStream(partialPath, {
    flags: append ? 'a' : 'w',
  });
  if (!response.body) throw new Error(`empty response body: ${url}`);
  const remainingBytes = Number(response.headers.get('content-length') ?? 0);
  const expectedBytes =
    remainingBytes > 0 ? existing + remainingBytes : undefined;
  let downloaded = 0;
  const startedAt = Date.now();
  const progress = setInterval(() => {
    const current = existing + downloaded;
    const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 1);
    const rate = downloaded / elapsedSeconds;
    const totalText = expectedBytes ? ` / ${formatBytes(expectedBytes)}` : '';
    console.log(
      `  ${formatBytes(current)}${totalText} (${formatBytes(rate)}/s)`,
    );
  }, 10_000);

  try {
    const reader = response.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const buffer = Buffer.from(value);
      downloaded += buffer.length;
      if (!stream.write(buffer)) {
        await once(stream, 'drain');
      }
    }
    stream.end();
    await once(stream, 'finish');
  } finally {
    clearInterval(progress);
  }

  renameSync(partialPath, path);
}

function writeManifest(records: DownloadRecord[]): void {
  mkdirSync(OPUS_ROOT, { recursive: true });
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    apiUrl: API_URL,
    datasetRoot: OPUS_ROOT,
    totalCompressedKiB: records.reduce((sum, row) => sum + row.size, 0),
    totalAlignmentPairs: records.reduce(
      (sum, row) => sum + alignmentPairs(row),
      0,
    ),
    corpora: records,
  };
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
}

async function main(): Promise<void> {
  mkdirSync(ZIP_DIR, { recursive: true });
  const rows = await fetchManifestRows();
  const records: DownloadRecord[] = rows.map((row) => {
    const localPath = join(ZIP_DIR, safeName(row));
    const exists = existsSync(localPath);
    return {
      ...row,
      localPath,
      downloadedBytes: exists ? statSync(localPath).size : 0,
      downloadedAt: exists
        ? new Date(statSync(localPath).mtimeMs).toISOString()
        : null,
      sha256: null,
      status: exists ? 'downloaded' : 'pending',
    };
  });

  writeManifest(records);
  console.log(
    `OPUS en-sq latest Moses: ${records.length} corpora, ` +
      `${records.reduce((sum, row) => sum + alignmentPairs(row), 0).toLocaleString()} pairs, ` +
      `${formatBytes(records.reduce((sum, row) => sum + row.size * 1024, 0))} reported compressed`,
  );

  for (const record of records) {
    if (existsSync(record.localPath)) {
      record.sha256 = await sha256(record.localPath);
      writeManifest(records);
      console.log(
        `skip ${record.corpus} ${record.version} (${formatBytes(record.downloadedBytes)})`,
      );
      continue;
    }

    const expected = formatBytes(record.size * 1024);
    console.log(`download ${record.corpus} ${record.version} (${expected})`);
    await download(record.url, record.localPath);
    record.downloadedBytes = statSync(record.localPath).size;
    record.downloadedAt = new Date().toISOString();
    record.sha256 = await sha256(record.localPath);
    record.status = 'downloaded';
    writeManifest(records);
    console.log(
      `done ${record.corpus} (${formatBytes(record.downloadedBytes)})`,
    );
  }

  writeManifest(records);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
