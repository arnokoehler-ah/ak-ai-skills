# AH Architecture Decision Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish and install the approved public architecture-decision skill with safe C4 tooling and native animations.

**Architecture:** A typed JSON deck uses shared diagram models and semantic shape groups. A native PowerPoint builder emits a static deck and animation manifest; a portable Python postprocessor groups shapes and instantiates verified effect templates. Separate local-only tools diagnose/render C4 and inspect/render PPTX outputs.

**Tech Stack:** Node >=22, PptxGenJS4.0.1, Sharp0.35.5, string-pixel-width1.11.0, Python >=3.10; optional local PlantUML and Office rendering.

**Spec:** `docs/superpowers/specs/2026-10-21-architecture-decision-slides.md`.

## Global Constraints

- Skill directory/name: `skills/ah-architecture-decision-slides`.
- Native editable 16:9 diagrams and AH Business typography/palette.
- One semantic group appears at most once in an entrance-animation plan; one click per step.
- Existing user outputs and inputs are preserved.
- No automatic installation, remote PlantUML rendering or unsafe includes.
- No comments in new code; rationale in the ADR.

## Review Focus

- Unknown/mistyped model IDs or targets must fail before generating misleading diagrams.
- A manifest from another PPTX must not animate the wrong shapes.
- Long text or overlapping model nodes must not silently degrade the presentation.
- Missing/broken tools must produce an actionable status rather than install or contact a remote service.
- Diagram labels must not become PlantUML directives, rich-text fetches or external SVG references.

### Task 1: Reference package and native renderer

**Files:** `skills/ah-architecture-decision-slides/{package.json,package-lock.json,SKILL.md}`, `scripts/{build.mjs,validate.mjs,layouts.mjs,text-fit.mjs}`, `assets/{theme.json,ah-logo.png}`, `examples/{decision.json,context.json}`, `references/*.md`, `tests/*.test.mjs`.

**Interfaces:** `node scripts/build.mjs INPUT.json OUTDIR` emits `presentation.pptx`, `animation-plan.json`, `click-script.md`; model nodes have stable IDs and explicit bounded positions; groups are encoded as semantic object-name prefixes.

- [ ] Record baseline consuming-agent behavior before writing the reference skill.
- [ ] Write failing end-to-end tests for output editability, geometry, references, evidence, baseline options and preservation.
- [ ] Implement the JSON contract, layouts and synthetic example; run tests to green.
- [ ] Write concise skill/reference instructions and run a fresh consuming-agent application.

### Task 2: Portable animation and safe local tooling

**Files:** `scripts/{animate.py,doctor.py,c4.py,verify.py,build.sh,doctor.sh,render-diagrams.sh,verify.sh,render-preview.py}`, `assets/animations/*.xml`, `assets/c4-smoke.puml`, provenance and installation references.

**Interfaces:** `python scripts/animate.py INPUT.pptx PLAN.json OUT.pptx [--show OUT.ppsx]`; `python scripts/c4.py MODEL.json OUTDIR`; `python scripts/doctor.py`; `python scripts/verify.py INPUT.pptx`.

- [ ] Extract generic native effect templates; strip source-specific target IDs and metadata.
- [ ] Write failing tests for semantic grouping/click counts, manifest mismatch, duplicate targets, missing tools and unsafe diagram inputs.
- [ ] Implement portable composition from templates and local-only C4/doctor commands; run tests to green.
- [ ] Build and inspect actual PowerPoint output, native animation read-back/playback, and local C4 SVG/PNG rendering.

### Task 3: Integrate, review and publish

**Files:** repository README, APM version1.3.0, CI, `.gitignore`, `docs/adr/0002-architecture-decision-presentations.md`.

- [ ] Add catalogue/installation/example documentation and CI for the new package.
- [ ] Run new and existing required checks; obtain one fresh final review and fix substantive findings with regressions.
- [ ] Publish normally to the requested public repository and verify remote revision/CI.
- [ ] Install the tagged skill in Claude Code and OpenCode; test the installed package.

## Self-review

The renderer produces named groups and a source hash consumed by the animator. Local-only C4 consumes a separate bounded context model, so it cannot execute arbitrary authored PlantUML. These interfaces cover the five review-focus cases. Native animation templates are generated data from the approved experiment; their assembly and target binding are newly tested behavior.
