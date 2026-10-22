# Deck content contract

The UTF-8 JSON root has `title` (1–120 characters), `language` (`nl` or `en`, default `nl`), optional `footer` (1–70 characters), and `slides` (1–60 entries).

## Every slide

| Field | Meaning |
|---|---|
| `layout` | `cover`, `closing`, `bullets`, `columns`, `metrics` or `chart` |
| `title` | 1–90 characters; use up to three short lines for covers and two for content slides |
| `kicker` | Optional 1–48 character section label; defaults to deck title |
| `notes` | Optional speaker notes; explain nuance and provenance here |
| `sources` | Optional array of 0–10 nonempty references, appended to speaker notes |
| `decision` | Optional 1–100 character takeaway bar on content slides |
| `image` | Optional local PNG/JPEG for cover, closing, bullets or columns; relative to this JSON file or absolute |

Use short natural lines. No authored text block accepts more than three newline-separated lines or an unbreakable word longer than 32 characters. This limit does not apply to file paths, notes or sources. The builder also measures Arial text against each layout's actual box using a conservative width/line-height allowance. Character limits below are ceilings, not guaranteed capacities. A cover title needs explicit short lines; content headings have space for at most two lines. Shorten text or split the slide rather than shrinking type to make a dense slide pass.

## Layout-specific fields

| Layout | Required / optional content |
|---|---|
| `cover`, `closing` | Optional `subtitle` (1–120 characters) and `steps` (1–3 labels, at most 18 characters each). With an image, use subtitle/notes for these ideas. |
| `bullets` | `bullets`: 1–5 strings, each 1–100 characters; prefer three points. |
| `columns` | `columns`: 2–3 objects with `title` (1–32 chars) and `body` (1–110 chars). With an image they become vertically stacked story beats. |
| `metrics` | `metrics`: 1–3 objects with textual `value` (1–10 chars) and `label` (1–42 chars). Values are supplied facts or explicitly labelled examples. |
| `chart` | `chart.type`: `bar` or `line`; `labels`: 1–8 nonempty strings up to 24 chars; `series`: 1–3 objects with `name` (1–30 chars) and finite numeric `values`, exactly one per label. |

Charts are native editable PowerPoint charts with embedded worksheets. Put units in the title, series names or speaker notes. Use prose for unknown numbers; `null`, numeric strings and mismatched vectors fail validation. Local images are cropped to fill their frame; inspect faces, hands and meaningful objects after rendering. Chart and metric layouts reserve the full content width for data.

## Minimal example

```json
{
  "title": "Pilotvoorstel",
  "language": "nl",
  "footer": "VOORSTEL",
  "slides": [{
    "layout": "bullets",
    "title": "Een compacte pilot.",
    "bullets": ["Zes weken", "Twee teams", "Start nog te bepalen"],
    "decision": "Voorstel: stel de startdatum vast.",
    "notes": "De besluitvraag is een redactioneel voorstel.",
    "sources": ["Door de gebruiker aangeleverde pilotbrief"]
  }]
}
```

For all six layouts, start from `examples/demo.json`. The output path must end in `.pptx`. Existing outputs are retained unless `--force` is supplied. A success response contains `visuallyVerified: false`: only inspecting the separately rendered slides changes the agent's verification assessment.
