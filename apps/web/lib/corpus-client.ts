/**
 * Client-side corpus loader. Statically imports every verb JSON so the
 * engine can be `configure()`d in the browser bundle. Used by Client
 * Components that need to call `conjugate()` (e.g., the playground).
 *
 * Server-side rendering uses `lib/corpus.ts` instead, which reads files
 * via `node:fs`.
 */

import { configure, type VerbEntry } from '@foljapp/engine';

import bej from '../../../data/verbs/bej.json';
import djeg from '../../../data/verbs/djeg.json';
import dua from '../../../data/verbs/dua.json';
import duhet from '../../../data/verbs/duhet.json';
import flas from '../../../data/verbs/flas.json';
import ha from '../../../data/verbs/ha.json';
import hap from '../../../data/verbs/hap.json';
import iki from '../../../data/verbs/iki.json';
import jam from '../../../data/verbs/jam.json';
import jap from '../../../data/verbs/jap.json';
import laj from '../../../data/verbs/laj.json';
import marr from '../../../data/verbs/marr.json';
import mund from '../../../data/verbs/mund.json';
import pi from '../../../data/verbs/pi.json';
import pjek from '../../../data/verbs/pjek.json';
import punoj from '../../../data/verbs/punoj.json';
import rri from '../../../data/verbs/rri.json';
import shoh from '../../../data/verbs/shoh.json';
import them from '../../../data/verbs/them.json';
import versionData from '../../../data/verbs/version.json';
import vij from '../../../data/verbs/vij.json';


const CORPUS: VerbEntry[] = [
  bej,
  djeg,
  dua,
  duhet,
  flas,
  ha,
  hap,
  iki,
  jam,
  jap,
  laj,
  marr,
  mund,
  pi,
  pjek,
  punoj,
  rri,
  shoh,
  them,
  vij,
] as VerbEntry[];

let configured = false;

export function ensureClientConfigured(): void {
  if (configured) return;
  configure(CORPUS, (versionData as { version: string }).version);
  configured = true;
}

// Configure eagerly on module load so any consumer sees a ready engine.
ensureClientConfigured();
