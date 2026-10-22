---
name: ak-ah-architecture-decision-slides
description: Use when preparing an AH architecture decision or investment presentation for MT, CTO or C-level, explaining why systems should change, comparing alternatives, or presenting C4 context and step-by-step architecture interactions with editable PowerPoint animations.
---

# AH Architecture Decision Slides

Make an architecture choice understandable and defensible in AH Business style. Start with the decision and evidence, then use stable diagrams to explain consequences. Read [the decision-story guide](references/decision-story.md) and [content contract](references/content-contract.md).

## Workflow

1. Reuse the supplied brief. Identify audience, requested mandate, owner, evidence and unresolved assumptions. Separate source claims, hypotheses, proposals and examples. Compare a baseline such as doing nothing with alternatives. Unknown ROI stays unknown.
2. Set `SKILL_DIR` to this skill's absolute directory and run:

```bash
bash "$SKILL_DIR/scripts/doctor.sh"
```

This read-only check includes a local C4 smoke render. If prerequisites are missing/broken, follow [installation policy](references/tooling.md): propose exact source/version/scope and obtain explicit approval before installing. Package dependencies use the bundled lockfile and `npm --prefix "$SKILL_DIR" ci --ignore-scripts` after approval. No automatic elevation, downloaded shell execution or remote rendering.
3. Copy `examples/decision.json` to the presentation project and author `decision.json`. Use the audience's language. A short executive story can lead to CTO detail. Use shared model IDs/coordinates, numbered interactions, visible trade-offs and one takeaway per slide. Sources and nuance belong in speaker notes.
4. Choose views deliberately: C4 context for scope/boundaries; before/after for change; dynamic interaction for behavior. Call a view a container model only when evidence establishes those boundaries. For optional local C4:

```bash
bash "$SKILL_DIR/scripts/render-diagrams.sh" context.json context-render
```

Missing tools leave `.puml` source and an honest status. Plain-label JSON is the accepted input; external includes are not supported.
5. Build the editable handout and optional presentation mode:

```bash
bash "$SKILL_DIR/scripts/build.sh" decision.json output
python3 "$SKILL_DIR/scripts/animate.py" output/presentation.pptx output/animation-plan.json output/animated.pptx --show output/animated.ppsx
bash "$SKILL_DIR/scripts/verify.sh" output/animated.pptx
```

Animation authoring is portable; groups, targets and a source hash protect the binding. Use one click per thought, grouped card/text fly-ins and short directional wipes. Read [animation guidance](references/animations.md).
6. Render the **actual PPTX** using `scripts/render-preview.py` with `--renderer powerpoint` on macOS or `--renderer libreoffice`. Inspect every slide. Check animated playback in PowerPoint, including the final click before advancing. Structural success is not visual/playback verification; report unavailable checks explicitly.
7. Deliver editable PPTX, optional PPSX, handout PDF/gallery, authored JSON, local assets, diagram sources, click script and verification status. Use fresh output directories and keep project content outside the installed skill.

## Quick reference

| Need | Use |
|---|---|
| Causal story / decision | `columns` |
| Compare alternatives | `options`, with one `baseline` |
| Same-level change | `before_after` |
| Stable explanation | `interaction`, shared model, optional table/callouts |
| Rendered C4 | `image`, local PNG/JPEG plus `.puml` source |

## Common mistakes

Do not present an attractive target diagram as evidence of ROI. Keep uncertainty visible. Avoid changing node positions between steps. Do not animate text separately from its card. Label simplifications and distinguish capability, system and deployment views. A public example uses synthetic content, not private source material.
