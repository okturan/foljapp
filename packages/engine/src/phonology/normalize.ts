/**
 * Final orthographic normalization. Applied at the very end of the
 * conjugation pipeline.
 */

export function normalize(form: string): string {
  return form
    .replace(/\s+/g, ' ')
    .trim();
}
