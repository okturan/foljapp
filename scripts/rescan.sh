#!/usr/bin/env bash
#
# Canonical corpus-lab full rescan, in the order that avoids the ordering
# traps documented in docs/ARCHITECTURE.md. Run after any change that alters
# generated targets (engine/verb-data) or adds a corpus source.
#
#   scripts/rescan.sh            # full chain
#   scripts/rescan.sh --plan     # print the steps without running them
#
# Long-running (~20 min). Stage markers are anchored (^STAGE / ^CHAIN) so a
# background monitor can grep them without false-matching crate names.
set -euo pipefail
cd "$(dirname "$0")/.."

steps=(
  "build:corpus-targets|regenerate generated forms to search for"
  "build:corpus-candidate-cache|build/refresh candidate-cache partitions AND target-hit sidecars"
  "scan:local-corpus:cached|rebuild the retained-examples SQLite (needs the cache from the step above)"
  "audit:corpus-misses:full|coverage + UniParser analysis + missing-forms audit"
  "report:corpus-raw-coverage|exact raw target-hit coverage"
  "report:corpus-phrase-variants:all|variant-recovery report (parity-gated)"
  "build:static-examples|regenerate the deployed per-verb example assets"
)

if [[ "${1:-}" == "--plan" ]]; then
  echo "Rescan chain (order matters):"
  for s in "${steps[@]}"; do
    printf '  npm run %-34s # %s\n' "${s%%|*}" "${s#*|}"
  done
  exit 0
fi

for s in "${steps[@]}"; do
  name="${s%%|*}"
  echo "STAGE $name START $(date +%H:%M:%S)"
  npm run "$name"
  echo "STAGE $name DONE $(date +%H:%M:%S)"
done
echo "CHAIN DONE $(date +%H:%M:%S)"
echo "Next: verify parity, then npm run deploy:pages to publish the assets."
