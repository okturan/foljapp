## ADDED Requirements

### Requirement: Every segment exposes an explanation

For every `DecompositionSegment` rendered on a verb page, the rendering element SHALL expose a one-line English explanation derived deterministically from `(segment.role, segment.meta?.particleName, segment.meta?.tense, segment.meta?.mood)`. The explanation SHALL be accessible via the native `title` attribute (so it works without JavaScript) AND surfaced via a richer hover/focus tooltip when JavaScript is available.

#### Scenario: Particle "do" carries the future-marker explanation

- **WHEN** the user inspects a segment with `role: "particle"` and `meta.particleName: "do"`
- **THEN** the segment's `title` attribute SHALL contain `"do"` and `"future"` (case-insensitive)
- **AND** with JavaScript enabled, hovering the segment SHALL surface a tooltip with the same content

#### Scenario: Particle "të" carries the subjunctive-marker explanation

- **WHEN** the user inspects a segment with `role: "particle"` and `meta.particleName: "të"`
- **THEN** the title SHALL contain `"të"` and `"subjunctive"`

#### Scenario: Voice marker "u" carries the middle-passive explanation

- **WHEN** the user inspects a segment with `role: "voice-marker"` and surface `"u"`
- **THEN** the title SHALL contain `"middle-passive"` and `"aorist"`

#### Scenario: Stem segments are labeled "verb stem"

- **WHEN** the user inspects a segment with `role: "stem"`
- **THEN** the title SHALL contain `"verb stem"` (or the participle's role label for compound forms)

### Requirement: Tooltip is reachable via keyboard focus

The tooltip-aware segment elements SHALL surface their explanation on keyboard focus as well as mouse hover. This means the segments are focusable (`tabIndex` set or implicit via element type) and the tooltip's open trigger includes `focus`.

#### Scenario: Tab-key focus opens the tooltip

- **WHEN** the user navigates the page with Tab and focuses a decomposition segment
- **THEN** a tooltip with the explanation SHALL be visible (in JS-enabled clients)
- **AND** screen readers SHALL announce the explanation via the title or aria-describedby attribute
