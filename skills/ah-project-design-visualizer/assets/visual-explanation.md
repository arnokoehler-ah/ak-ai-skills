# Visual explanation contract

The first screen answers: what does this project do, and what matters most? A few illustrated cards explain the mechanism. Every card has a native disclosure below its figure with the exact code evidence and links to the technical diagrams. The existing technical explorer follows this introduction.

## Required shape for new overviews

Put `explainer` in `current-state.yaml` and derive the identical object in `overview-data.json`. Existing render fields remain populated. Set `presentation.language` to `nl` or `en`; match the user's language in all authored text.

For new reports also provide `presentation.languages: ["nl", "en"]` and canonical `translations` as defined in `assets/bilingual-overviews.md`. Include illustration and technical-diagram labels in the other language's dictionary; the runtime toggle preserves the technical viewer's state.

```json
{
  "explainer": {
    "title": "Orders zonder omwegen",
    "summary": "De API haalt orders op en zoekt daarna per order de klant.",
    "confidence": "VERIFIED",
    "basis": "code",
    "evidence": "src/orders.py:20-31",
    "cards": [
      {
        "id": "customer-lookups",
        "title": "Haal pakketjes samen op",
        "takeaway": "Iedere order veroorzaakt nu een extra klantlookup.",
        "illustration": "customer-lookups",
        "alt": "Losse klantvragen naast een gezamenlijke lading",
        "confidence": "VERIFIED",
        "basis": "code",
        "evidence": "src/orders.py:31",
        "details": [
          {
            "title": "Wat gebeurt er?",
            "text": "De klantquery staat binnen de orderlus.",
            "confidence": "VERIFIED",
            "basis": "code",
            "evidence": "src/orders.py:31"
          },
          {
            "title": "Wat is niet gemeten?",
            "text": "De productielatency is onbekend; er zijn geen runtime-metingen.",
            "confidence": "UNKNOWN",
            "basis": "unknown",
            "evidence": ""
          }
        ],
        "action": {
          "text": "Onderzoek het batchen van klantqueries.",
          "effort": "small"
        },
        "diagram_ids": ["c4-container", "seq-get-orders"]
      }
    ]
  }
}
```

The corresponding asset is `docs/illustrations/customer-lookups.svg`. Use letters, digits, hyphens, and underscores for new IDs and filenames. Legacy diagram filenames containing dots, spaces, or non-ASCII characters remain supported; the builder derives safe DOM IDs separately. Narrative fields are plain text, not HTML. `details` is an array of evidence-tagged paragraphs. `action` and `diagram_ids` are optional. Effort is `small`, `medium`, or `large`; the renderer labels actions as proposals, not implemented fixes. References in `diagram_ids` must point to existing technical diagrams.

## Evidence has two dimensions

| Field | Values | Meaning |
|---|---|---|
| `confidence` | `VERIFIED`, `INFERRED`, `UNKNOWN` | How firmly this claim is supported |
| `basis` | `code`, `local-test`, `production`, `inference`, `unknown` | What kind of evidence supports it |

Every verified claim has an exact source reference. A local reproduction cites its fixture/script and conditions; a production measurement cites its recorded result and observation window. A code-derived query count stays `basis: code`, even when the arithmetic is exact. Inferred effects use `INFERRED` / `inference`. Unsupported performance conclusions remain `UNKNOWN` / `unknown`.

Keep different confidence levels in separate detail paragraphs. “This loop makes another query” and “production is slow” are different claims. The sample JSON above demonstrates the split without inventing measurements.

## Compose the story

1. Lead with one concrete purpose and a one- or two-sentence verdict grounded in the inventory.
2. Select a few important mechanisms: the main journey, a defensible design choice, and observed problems when present. Usually 3–6 cards suffice; the full inventory holds everything else.
3. For each card, draw one idea and write one plain-language takeaway. Good concepts include one parcel per roundtrip, a shared transaction boundary, or a timeline showing late visibility.
4. In the disclosure explain the real mechanism, the evidence, the trade-off, and a grounded proposed improvement if useful. Keep existing C4 and sequence diagrams linked here and available in their own section.
5. End with the existing actionable checklist, retaining browser-saved progress and `human_notes` on update.

## Draw the mechanism

- Use original flat SVG shapes, a dark navy background, mint for a useful route, coral for friction, yellow for attention, and lilac for documents. Colors supplement labels and symbols.
- Use a `viewBox` around `0 0 500 260`, short labels, and a meaningful `<title>`. Use 20–24 SVG units for important labels so they remain legible on a phone. More complex layouts need a vertical mobile-friendly arrangement.
- Name the concrete participants. Arrows mean something: request, event, write, commit, or data movement. Put a brief label on any ambiguous relation.
- A comparison labels current behavior and a proposed alternative. A timeline preserves actual ordering. A bar chart needs measured values and units; an analogy is not a benchmark.
- Illustrations are standalone SVG files with no scripts, remote assets, remote fonts, or animations. Inline local definitions and shapes are fine. The builder embeds them; the template prefixes IDs when reusing an illustration.
- Start from `assets/example-illustrations/` for dimensions and visual tone, then redraw the project-specific mechanism. Do not reuse a broken transaction illustration for an unrelated caching issue.

## Keep technical diagrams technical

C4 shows systems, real deployable containers, and relevant components at separate levels. Sequence diagrams retain participants, actual messages, error/retry branches, and transaction/commit boundaries. Keep code references in notes when long labels make the message unreadable. Inferred relationships remain visibly marked.

The builder supports `arch.puml`, `c4-*.puml`, `seq-*.puml`, and `er.puml`. Render locally with plain PlantUML or the bundled `<C4/...>` library. Use `assets/theme.puml` through the builder for consistent styling. Natural-size scroll panes and zoom keep large diagrams useful.

## Check the result

Build from the canonical data and open the output offline. Verify a phone-width view, a desktop view, keyboard-operated disclosures, C4/sequence navigation, search/journey filtering, and saved checklist state. Confirm that pictures load and long code references wrap. A missing picture degrades to its alt text, which is a fallback to report and fix, not a completed illustration.
