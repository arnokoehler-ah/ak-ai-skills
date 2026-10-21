# Native, click-controlled architecture storytelling

Animations are an optional presentation mode for the same complete, editable handout. They should reveal causality and responsibility, not decorate every object.

## Authoring

```bash
python3 scripts/animate.py output/presentation.pptx output/animation-plan.json output/animated.pptx --show output/animated.ppsx
```

This is portable Python and does not launch Office or install anything. It uses PowerPoint-authored entrance-effect templates, stable semantic group names and a source hash. It groups card/background/text or arrow/label parts into coherent objects, preserves their final geometry and writes native PresentationML timing. Existing outputs are refused. The `.ppsx` starts as a slideshow when opened in PowerPoint; `.pptx` is the editable version.

## A useful sequence

1. Establish the components and their responsibilities.
2. Reveal the initiating request or change.
3. Show downstream work and responses.
4. Reveal a constraint or failure and the owner's reaction.
5. Show the combined outcome or customer consequence.
6. Finish with the decision or takeaway.

Choose only the steps needed for this case. One click corresponds to one thought. Related parts start together with **With Previous**, rather than requiring a click for each label. The default duration is 0.35 seconds; the generated manifest permits 0.1–2 seconds if a different pace is deliberate.

Fly-ins from left/right suit grouped components and callouts. Directional wipes suit exchanges. Fades suit evidence, tables and conclusions. Once revealed, an element remains where the audience learned to find it.

## Verify playback

Check the native animation pane, target grouping, directions, click count, phase order and the final click before moving to another slide. A static PDF is useful for the completed layout but does not prove motion. The portable writer is verified against PowerPoint-compatible native templates; another presentation application's timing behavior needs its own check.

Do not infer playback success from a valid XML tree. Deliver `click-script.md` and an explicit playback-verification status. Source files and effects remain editable; no macros are embedded.
