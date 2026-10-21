# AH Business Slides

## Intent

Publish an independently installable `ah-business-slides` Agent Skill in `arnokoehler-ah/ak-ai-skills`. It turns a brief and supplied facts into an editable PowerPoint in the approved AH-inspired business style: white space, cyan/navy, large headlines, deliberate alignment and an explicit takeaway or decision.

## Deliverable

The self-contained skill includes concise agent instructions, a documented JSON content contract, style guidance, a runnable example, a pinned Node package, a presentation builder and an actual-PowerPoint preview workflow. The agent adapts the example content to the user's brief, builds the deck and inspects rendered slides before delivery.

- Six layouts: cover, bullets, columns, metrics, chart and closing.
- 16:9, Arial fallback, native editable text/shapes/charts and speaker notes.
- Images remain image objects; the deck is not a collection of slide screenshots.
- The input language controls deck copy. Both Dutch and English examples of invocation are documented; translation is not automatic.
- Charts contain supplied numeric series. Unknown facts remain unknown; example figures are explicitly fictional.
- The builder validates required fields, text density, chart dimensions and local image availability before writing output. It refuses an existing output unless `--force` is supplied.
- The builder is runnable from any working directory; image paths resolve relative to the input JSON.
- Preview uses installed LibreOffice, or Microsoft PowerPoint on macOS when explicitly selected, followed by Poppler. It produces an actual-render PDF, PNGs and an HTML gallery.
- Generated project decks are written outside the installed skill. Dependencies install inside the skill with `npm ci`.
- A colleague needs only this public skill, Node >=22, Python >=3.10 and a supported rendering toolchain for visual verification.

## Builder choices

Use PptxGenJS 4.0.1 to preserve native editability. Slidev remains suitable for interactive web talks, but the deliverable here is a native PowerPoint. Use the existing repository's APM distribution and validation conventions. Keep the logo as a local asset with its public source recorded. The style is AH-inspired, not a claim to be an official corporate template.

## Acceptance

The example builds without external assets; PPTX inspection finds native text, a native chart with embedded data and notes; malformed or overflowing inputs fail clearly; real rendered slides are inspected; the skill passes an application test in a fresh agent session; existing repository checks remain green. Publish the verified skill and installation instructions to the requested repository.
