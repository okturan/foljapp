interface VerbRouteEntry {
  id: string;
}

export function verbSlug(entry: VerbRouteEntry): string {
  return entry.id;
}

export function verbHref(entry: VerbRouteEntry): string {
  return `/verb/${encodeURIComponent(verbSlug(entry))}`;
}

export function decodeVerbSlug(slug: string): string {
  let decoded = slug;

  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return decoded;
    }
  }

  return decoded;
}
