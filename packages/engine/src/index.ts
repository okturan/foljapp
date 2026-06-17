/**
 * @foljapp/engine — Albanian verb conjugation engine.
 *
 * Public surface:
 *   - configure(corpus, version?)  — register the verb corpus
 *   - conjugate(verbId, options)   — conjugate one cell
 *   - table(verbId)                — full mood/tense/voice/cell matrix
 *   - participle(verbId)           — quick participle lookup
 *   - allCells()                   — every supported cell
 *   - listVerbs()                  — all configured verb entries
 *   - VERSION                      — engine version string
 *
 * Errors are typed; narrow against EngineError, UnknownVerbError,
 * UnsupportedCellError, InvalidOptionsError, CorpusIntegrityError.
 */

export {
  conjugate,
  configure,
  participle,
  table,
  allCells,
  listVerbs,
  joinDecomposition,
} from './conjugate.js';

export { trace } from './trace.js';

export { VERSION } from './version.js';

export {
  EngineError,
  UnknownVerbError,
  UnsupportedCellError,
  InvalidOptionsError,
  CorpusIntegrityError,
} from './errors.js';

export type {
  Mood,
  IndicativeTense,
  SubjunctiveTense,
  ConditionalTense,
  AdmirativeTense,
  OptativeTense,
  ImperativeTense,
  Tense,
  NonFiniteForm,
  Voice,
  Polarity,
  Modality,
  Person,
  GrammaticalNumber,
  CellLabel,
  CellKey,
  ConjugateOptions,
  MorphologicalRole,
  DecompositionSegment,
  ConjugationResult,
  TraceStep,
  VerbEntry,
  VerbEntrySource,
  VerbEntryFlags,
  EnglishForms,
  VerbTable,
  TenseCells,
} from './types.js';

export { cellLabel } from './types.js';

export {
  ancTagQueryForOptions,
  cellDisplayLabel,
  cellLabelFromSignature,
  cellSignature,
  cellSignatureFromCell,
  generatedSearchTarget,
  normalizeSearchKey,
  normalizeSearchToken,
  searchTokens,
} from './corpus-tags.js';

export type { AncTagQuery, GeneratedSearchTarget } from './corpus-tags.js';
