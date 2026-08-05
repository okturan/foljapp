#!/usr/bin/env bash
# Verify a raw corpus cache — local or a restored backup — against the
# tracked sha256 manifest.
#
#   npm run verify:corpus-checksums                 # verify .cache/datasets
#   npm run verify:corpus-checksums -- /Volumes/SSD/foljapp-datasets
#
# Reports missing files separately from digest mismatches: a missing path
# usually means an incomplete copy, a mismatch means corruption.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$REPO_ROOT/data/corpora/checksums.sha256"
TARGET="${1:-$REPO_ROOT/.cache/datasets}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: manifest not found: $MANIFEST" >&2
  exit 2
fi
if [[ ! -d "$TARGET" ]]; then
  echo "error: cache directory not found: $TARGET" >&2
  exit 2
fi

echo "Verifying $TARGET"
echo "  against $MANIFEST"

total=0
missing=0
missing_paths=()
while IFS= read -r line; do
  [[ "$line" =~ ^# ]] && continue
  [[ -z "$line" ]] && continue
  total=$((total + 1))
  path="${line#*  }"
  if [[ ! -f "$TARGET/$path" ]]; then
    missing=$((missing + 1))
    missing_paths+=("$path")
  fi
done < "$MANIFEST"

if (( missing > 0 )); then
  echo
  echo "MISSING: $missing of $total files are absent from the cache:" >&2
  printf '  %s\n' "${missing_paths[@]}" >&2
  echo >&2
  echo "An incomplete copy, not corruption. Re-copy the missing paths." >&2
  exit 1
fi

# All present — now check digests. shasum -c reads the manifest from stdin
# so paths resolve relative to the target directory.
cd "$TARGET" || exit 2
if grep -v '^#' "$MANIFEST" | grep -v '^$' | shasum -a 256 -c --quiet; then
  echo
  echo "OK — $total files verified, no corruption."
  exit 0
fi

echo >&2
echo "FAILED — digest mismatches above. Those files are corrupt; re-download" >&2
echo "or restore them from another copy before trusting any scan output." >&2
exit 1
