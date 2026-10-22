# Visual entry with technical depth

## Context

The existing overview is an evidence-tagged inventory with PlantUML diagrams and useful exploration controls. Its dense first screen makes initial understanding expensive for a tired reader. The desired change is a visual explanation that retains technical detail and the existing canonical data workflow.

## Decisions

- Add an `explainer` projection to the canonical YAML and render JSON. Its plain-language claims carry the same confidence requirements as the inventory, plus an evidence-basis field distinguishing code, local experiments, production observations, inference, and unknowns.
- Embed authored local SVG illustrations through the existing build pipeline. This supports project-specific visual mechanisms without external assets or a second runtime dependency.
- Render native disclosures below figures; retain cockpit, filters, journeys, C4, sequence diagrams, data models, and saved actions as the technical view.
- Support explicit C4 filenames in addition to the existing architecture filename. Keep technical diagrams at natural size with scrolling and bounded zoom rather than shrinking them into illustration cards.
- Accept legacy render JSON without `explainer`. Preserve the existing action-storage key to retain saved progress.
- Escape closing tags when embedding render JSON so ordinary narrative text cannot terminate its script container.
- Derive DOM identifiers separately from legacy diagram filenames. Namespace illustration IDs together with their fragment URLs and stylesheet selectors so multiple illustrations retain their markers, gradients, and styling.

## Trade-offs

Authored SVGs require more care than automatic boxes, but convey mechanisms more effectively. Canonical YAML and its render JSON still require disciplined derivation; this change does not introduce an automatic YAML converter. Proposal text is explicitly distinct from the observed current state. Larger technical diagrams use a dedicated scroll pane so the page itself remains usable on narrow screens.
