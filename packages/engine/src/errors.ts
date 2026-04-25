/**
 * Typed error classes for engine consumers to narrow against.
 */

export class EngineError extends Error {
  override readonly name: string = 'EngineError';
  constructor(message: string) {
    super(message);
  }
}

export class UnknownVerbError extends EngineError {
  override readonly name = 'UnknownVerbError';
  readonly verbId: string;
  constructor(verbId: string) {
    super(`Unknown verb: "${verbId}". No corpus entry found.`);
    this.verbId = verbId;
  }
}

export class UnsupportedCellError extends EngineError {
  override readonly name = 'UnsupportedCellError';
  readonly cell: string;
  constructor(cell: string, reason?: string) {
    super(
      reason
        ? `Unsupported cell ${cell}: ${reason}`
        : `Unsupported cell ${cell}`,
    );
    this.cell = cell;
  }
}

export class InvalidOptionsError extends EngineError {
  override readonly name = 'InvalidOptionsError';
  constructor(message: string) {
    super(`Invalid conjugate options: ${message}`);
  }
}

export class CorpusIntegrityError extends EngineError {
  override readonly name = 'CorpusIntegrityError';
  readonly verbId: string;
  constructor(verbId: string, message: string) {
    super(`Corpus integrity error for "${verbId}": ${message}`);
    this.verbId = verbId;
  }
}
