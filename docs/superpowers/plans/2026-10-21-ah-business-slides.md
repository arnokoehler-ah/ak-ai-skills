# AH Business Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reusable, native-editable AH business PowerPoint skill.

**Architecture:** A reference skill guides the agent to author a bounded JSON deck. A local PptxGenJS builder consumes that contract; an independent Office rendering toolchain produces preview evidence. The package is independently installable through the existing APM repository.

**Tech Stack:** Node >=22, PptxGenJS 4.0.1, Python >=3.10, PowerPoint/macOS or LibreOffice, Poppler.

**Spec:** `docs/superpowers/specs/2026-10-21-ah-business-slides.md`

## Global Constraints

- Six layouts: cover, bullets, columns, metrics, chart and closing.
- 16:9, Arial fallback, native editable text/shapes/charts and speaker notes.
- The builder is runnable from any working directory; image paths resolve relative to the input JSON.
- Refuse an existing output unless `--force` is supplied.
- No comments in new code; rationale belongs in the ADR.
- Public package contains only generic sample facts and public brand assets.

## Review Focus

- Long text must fail with an actionable error rather than produce clipped slides.
- Chart labels, series lengths and finite values must be validated before writing a file.
- Missing or remote images must fail instead of silently disappearing.
- Output collisions must preserve existing user files.
- Preview evidence must originate from the generated PPTX, not a separate HTML approximation.

### Task 1: Build and verify the reference package

**Files:** `skills/ah-business-slides/{SKILL.md,package.json,package-lock.json}`, `references/{content-contract.md,style-guide.md}`, `assets/{theme.json,ah-logo.png,ah-logo.svg,SOURCES.md}`, `examples/demo.json`, `scripts/{build.mjs,deck.mjs,validate.mjs,render-preview.py}`, `tests/deck.test.mjs`.

**Interfaces:** `validateDeck(input, inputDirectory)` returns validated input or throws; `buildDeck(inputPath, outputPath, {force:false})` writes a native PPTX; CLI `node scripts/build.mjs INPUT OUTPUT [--force]`; preview `python3 scripts/render-preview.py INPUT.pptx OUTPUT_DIRECTORY --renderer powerpoint|libreoffice`.

- [ ] Run a baseline application scenario without the skill and record actual gaps.
- [ ] Write tests for native text/chart/notes, all layouts, malformed/dense content, images relative to input and existing-output preservation; run and observe missing-feature failures.
- [ ] Implement validation, native layout rendering, example, theme and package invocation.
- [ ] Write the concise reference skill and supporting content/style contracts addressing the baseline retrieval gap.
- [ ] Run `npm test` inside the skill; expect all tests pass.
- [ ] Build the example, render the actual PPTX to PDF/PNG, inspect every slide and fix visible defects.
- [ ] Run a fresh-agent application scenario using only the installed-style package contract; expect a new valid deck and honest rendering status.
- [ ] Commit the package and its verification evidence.

### Task 2: Integrate and publish

**Files:** repository `README.md`, `.gitignore`, `apm.yml`, `.github/workflows/validate.yml`, `docs/adr/0001-native-powerpoint-skills.md`.

**Interfaces:** APM virtual dependency `arnokoehler-ah/ak-ai-skills/skills/ah-business-slides`; repository version 1.2.0.

- [ ] Add the skill catalogue entry, pinned installation commands and runtime prerequisites; correct the outdated private-repository wording.
- [ ] Add CI installation and execution of the new package tests and an actual LibreOffice rendering check.
- [ ] Run `bash scripts/validate-skills.sh`, existing visualizer build/browser tests, and `npm test` for the new skill; expect green.
- [ ] Obtain one fresh-context final code review, resolve substantive findings and verify affected cases.
- [ ] Publish the reviewed commits to the requested repository with a normal fast-forward push; verify remote SHA and visibility.

## Plan review

The input contract, native renderer and preview share the same PPTX output boundary. Tests cover all five review-focus conditions. The package is a reference skill; multi-repetition wording tests and discipline/rationalization tables are not applicable. The approved browser mockups establish the visual direction; the native example must be inspected independently.
