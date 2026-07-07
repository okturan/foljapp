## 1. Pre-flight

- [x] 1.1 Root-caused the red E2E: 6dc3822's `ssr: false` tables vs the
      SSR-only requirement; user ratified client-render 2026-07-07.

## 2. Spec + config

- [x] 2.1 MODIFIED `reference-pages` rendering requirement (static shell +
      client tables + placeholder).
- [x] 2.2 `openspec/config.yaml` quality bar carve-out.

## 3. Tests

- [x] 3.1 Retired the no-JS table test with an explanatory comment; the
      JS-enabled keyboard-focus equivalent stays.
- [x] 3.2 Full E2E suite green: 127/127 (also loosened two hardcoded
      `engine: 0.1.0` assertions to `0.1.\d+` — they broke on the 0.1.1
      bump, not on this change).

## 4. Validation

- [x] 4.1 `openspec validate accept-client-rendered-tables --strict`
      passes.
