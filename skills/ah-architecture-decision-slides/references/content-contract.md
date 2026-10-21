# JSON deck contract

Start from `examples/decision.json`. All geometry is in inches on a 16:9 canvas; the diagram body uses coordinates relative to its upper-left at slide position `(0.7, 2.8)`. The renderer rejects oversized text and overlapping nodes rather than silently shrinking it.

## Root and shared models

Root: `title` (1–100 chars), `language` (`nl`/`en`, default `nl`), `audience` (`mt`/`cto`/`c-level`, default `mt`), `models` (object) and `slides` (1–40).

Identifiers use lowercase letters, digits and underscores, beginning with a letter, maximum 48 characters. Reuse a model to keep positions identical across views.

A model contains:

- `nodes` (2–8): `id`, `title` (50 chars), optional `detail` (80), `x`, `y`, optional `w` (default 2.8), `h` (default 0.9). Optional `context: true` mutes a context node. Optional `titleSize` 13–20 pt and `detailSize` 10–14 pt control deliberate diagram typography.
- `edges` (0–16): `id`, `from`, `to`, optional `label` (50), `kind` (`request`/`response`). Optional `via` contains 1–4 intermediate `[x,y]` points; endpoints stay anchored to the declared nodes. Routes through unrelated nodes are rejected.
- Optional `annotations` (0–6): `id`, `text` (140), `x`, `y`, `w`, `h`, optional `tone` (`info`/`warning`). Annotations must not overlap nodes.

All model elements fit inside a body of 11.9 × 3.1 inches. Node sizes are 1.4–5 inches wide and 0.8–1.5 high. For an interaction with a table, nodes and annotations must fit above y=1.85. Typography limits remain applicable within these bounds.

## Every slide

`id`, `layout`, `title` (100 chars) and `basis` (`source`, `hypothesis`, `proposal`, `example`) are required. Optional: `kicker` (60), `takeaway` (115), `notes` (speaker notes), `sources` (up to 10 nonempty citations). A `source` slide requires sources. Titles normally need no more than two short lines.

| Layout | Fields |
|---|---|
| `columns` | 2–3 `columns`, each `title` (45), `body` (170), optional `label` (30). |
| `options` | 2–3 `options`, each `title` (40), `benefit` (100), `tradeoff` (100). Exactly one has `baseline: true`; at most one has `preferred: true`. |
| `before_after` | 1–3 `rows`, each `label` (20), `before` (90), `after` (90). |
| `interaction` | `model` ID; optional `focus` array of node/edge IDs; optional table below. |
| `image` | Local PNG/JPEG `image`, relative to the input JSON or absolute. The image is aspect-preserving; diagram sources should travel with it. |

Character limits are ceilings, not guarantees of fit. Shorten or split a dense slide. All fields are plain authored content; no implicit business calculations or automatic ROI estimates occur.

### Interaction table

Optional `table`: 2–5 `columns` with unique `key` and `title` (28 chars); 1–3 `rows`, each supplying a string (40 chars) or finite number for every key. Optional `emphasisRows` is an array of zero-based row indices. Numbers are rendered as supplied, so include currency/units deliberately.

## Animation steps

Each slide may have 1–12 `steps`. A step contains a `cue` (300 chars) and a `show` array:

```json
{"cue":"Show the responsibilities.","show":[
  {"target":"node-processing","effect":"fly-left"},
  {"target":"node-status","effect":"fly-right"}
]}
```

Effects: `fly-left`, `fly-right`, `wipe-left`, `wipe-right`, `fade`. The first group starts on click; the others start with it. Each target can enter only once. Unlisted groups remain visible from the start.

Targets: `node-ID`, `edge-ID`, `note-ID`; `column-1`, `option-1`, `row-1` (one-based); `table-frame`, `table-col-KEY`, `table-highlight-INDEX` (zero-based); `diagram`; `takeaway` when present. The renderer names the underlying objects, so the animation plan does not rely on guessed numeric shape IDs.

The build creates `presentation.pptx`, `animation-plan.json`, `click-script.md` and `verification.json` in a **new** directory. The manifest is bound to that PPTX's SHA256. Rebuild after edits; do not reuse a manifest for another deck. `visualReview: pending` is intentional until actual rendering is inspected.
