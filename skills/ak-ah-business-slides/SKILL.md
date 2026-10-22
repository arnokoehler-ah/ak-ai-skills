---
name: ak-ah-business-slides
description: Use when creating or updating a professional Albert Heijn or AH business presentation, management deck, proposal, roadmap, project update or editable PowerPoint in a clean corporate style.
---

# AH Business Slides

Create a clear, editable 16:9 PowerPoint using the bundled AH-inspired layouts. The visual language is white space, AH cyan, deep navy, large headlines and one message per slide. Read [the style guide](references/style-guide.md) and [the content contract](references/content-contract.md).

## Workflow

1. Identify the audience, purpose, requested decision, language and supplied facts. Reuse an existing brief. Ask only for information that changes the story; mark unknowns explicitly. Distinguish facts from proposals and fictional example data.
2. Set `SKILL_DIR` to this skill's absolute directory. Copy `examples/demo.json` into the user's presentation project as `deck.json`, then author the actual story with the documented layouts. Replace all example claims. Add speaker notes and source references per slide.
3. Install the pinned dependencies and build:

```bash
npm --prefix "$SKILL_DIR" ci
node "$SKILL_DIR/scripts/build.mjs" "$PWD/deck.json" "$PWD/presentation.pptx"
```

4. Render the **generated PPTX** and inspect every PNG in the gallery:

```bash
python3 "$SKILL_DIR/scripts/render-preview.py" "$PWD/presentation.pptx" "$PWD/preview" --renderer libreoffice
```

On macOS with Microsoft PowerPoint, use `--renderer powerpoint`. Rendering needs Python 3.10+, the selected application and Poppler's `pdftoppm`. Generation needs Node 22+. If rendering tools are unavailable, deliver the editable draft with its unverified visual status stated explicitly.

5. Check clipping, overlaps, label readability, chart units, image crops, source fidelity and decision clarity. Shorten or split dense content, rebuild with `--force`, and render into a fresh preview directory. Never treat a successful ZIP/build check as visual verification.
6. Deliver `presentation.pptx`, `deck.json`, used local images, the PDF/PNG gallery when rendered, and a short verification summary. Keep generated project files outside this installed skill.

## Quick reference

| Need | Layout or operation |
|---|---|
| Opening or closing | `cover`, `closing` |
| Decisions and plans | `bullets`, `columns` |
| Supplied numbers | `metrics`, native `chart` |
| Existing deck content | Re-author its approved content into JSON; this builder does not import PPTX |
| Replace an output | Add `--force` only for the intended file |
| Script help | `node scripts/build.mjs --help` |

## Common mistakes

- A screenshot deck is not editable: use native text, shapes and chart data through this builder.
- Example numbers are not project facts; keep missing values visible in prose rather than inventing chart data.
- Image paths are relative to `deck.json`, not the terminal directory. Bundle the images with the source.
- Character limits are density checks, not proof of fit. Inspect the actual Office render.
- The branded assets and design are AH-inspired; an official template supplied by the user takes precedence.
