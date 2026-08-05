import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const assetPath = new URL('../docs/motion/search-to-reference.gif', import.meta.url);
const readmePath = new URL('../README.md', import.meta.url);
const provenancePath = new URL('../docs/motion/README.md', import.meta.url);

const [asset, assetStat, readme, provenance] = await Promise.all([
  readFile(assetPath),
  stat(assetPath),
  readFile(readmePath, 'utf8'),
  readFile(provenancePath, 'utf8'),
]);

assert.match(asset.subarray(0, 6).toString('ascii'), /^GIF8[79]a$/);
assert.equal(asset.readUInt16LE(6), 800);
assert.equal(asset.readUInt16LE(8), 450);
assert.ok(assetStat.size > 0 && assetStat.size < 100_000, 'motion proof must stay non-empty and below 100 KB');

const linkedProof = '[![Searching for pun and opening the complete punoj reference](docs/motion/search-to-reference.gif)](https://foljapp.pages.dev/)';
assert.ok(readme.includes(linkedProof), 'README must link the motion proof to the live app');
assert.ok(readme.includes('not a staged mockup'), 'README must state the evidence boundary');
const destinationMatch = provenance.match(/^- \*\*Destination:\*\* <([^>]+)>$/m);
assert.ok(destinationMatch, 'provenance must declare one destination URL');
const destination = new URL(destinationMatch[1]);
assert.equal(destination.href, new URL('/verb/punoj', 'https://foljapp.pages.dev/').href);
assert.ok(provenance.includes('60 real page screenshots'));
assert.ok(provenance.includes('no account, browser-profile, microphone, camera, or production-user information'));

process.stdout.write(`Verified README motion proof: GIF89a 800x450, ${assetStat.size} bytes\n`);
