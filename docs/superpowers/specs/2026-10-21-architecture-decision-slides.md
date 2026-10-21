# AH Architecture Decision Slides

## Approved intent

Create the third public skill, `ah-architecture-decision-slides`, in this repository. It helps an agent explain and substantiate an architecture decision to MT, CTO or C-level in the approved AH Business visual language. It combines cause/consequence, before/after, options including the baseline, stable interaction diagrams and an explicit decision request. The user approved complete native diagram examples and click-controlled grouped fly-in/wipe/fade animations.

## Package contract

- Self-contained Agent Skill with pinned Node dependencies and Python standard-library tooling; no runtime dependency on another installed skill.
- Native editable PowerPoint text, cards, connectors and tables. Diagram positions come from a shared model so progressive views cannot silently move components.
- A documented JSON input supports columns, before/after, options, interaction views and local diagram images. Every slide identifies whether it contains source evidence, a hypothesis, a proposal or example content. Source-evidence slides require citations.
- Options compare at least one baseline with alternatives. Unknown ROI remains unknown. An architectural recommendation is conditional on actual constraints and evidence, not a predetermined claim that change is always necessary.
- Build outputs: `presentation.pptx`, source-linked speaker notes, a semantic animation manifest and a click script. Existing output directories are preserved.
- Animation output: ordinary `.pptx` and `.ppsx`, produced portably from PowerPoint-authored effect templates. Named semantic groups replace prototype-specific shape IDs. One click per thought; related objects animate together; default duration 0.35 seconds. Playback must be verified independently of ZIP/XML correctness.
- Optional C4 context source/rendering via local PlantUML. Only generated, bounded model input and a fixed local standard-library include are accepted. SANDBOX security profile, timeouts and output checks apply. No remote render fallback.
- Read-only doctor checks actual C4 rendering and reports ready/missing/broken. It never installs software. Missing prerequisites produce an installation proposal requiring explicit user approval, with source/version/scope. No automatic elevation or pipe-to-shell installation.
- Public demo is synthetic and generic. The user's internal reference deck is not part of the package.

## Verification

Tests cover input references, fixed model geometry, text fit, output preservation, grouped animation targets and clicks, tampered manifests, missing toolchains, unsafe diagram labels and no-install behavior. Build/render the synthetic demo in PowerPoint; validate portable animations by PowerPoint read-back and playback. Exercise a fresh-agent consuming scenario and a fresh APM install. Keep existing repository checks green.
