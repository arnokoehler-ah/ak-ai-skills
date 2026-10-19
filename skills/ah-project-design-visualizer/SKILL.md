---
name: ah-project-design-visualizer
disable-model-invocation: true
description: Use when a developer needs to understand an unfamiliar or vibe-coded project's actual architecture, working features, gaps, or data flows, especially when they want an accessible visual overview with deeper code evidence, C4, and sequence diagrams.
---

# ah-project-design-visualizer

This skill reconstructs the **current, actual state** of a project from repository evidence — not an idealized or aspirational architecture. It produces two artifacts: a canonical `docs/current-state.yaml` (the full evidence-tagged inventory) and a self-contained `docs/project-overview.html` (the rendered view). Write the YAML and PlantUML diagrams first, derive the JSON render data from them, then run the build to produce the HTML. Every claim in every artifact must carry an evidence tag (`VERIFIED`, `INFERRED`, or `UNKNOWN`). If you cannot verify something from the code, say so.

**Default reading experience:** a short visual explanation first, the complete engineering view underneath. The explanation adds an entry point; C4, sequence diagrams, the cockpit, journey filters, searchable inventory, and saved next actions remain available. Use the user's language for the narrative; set `presentation.language` to `nl` for Dutch controls or `en` for English controls.

**Read `assets/visual-explanation.md` before authoring the overview.** It defines the supported `explainer` data contract, illustration recipe, and evidence layers. New overviews include `explainer` in both canonical YAML and render JSON. The renderer also accepts older JSON without it.

**New overviews are bilingual by default:** set `presentation.language` to the authored source language and `presentation.languages` to `["nl", "en"]`. Put the other language's exact-text dictionary in canonical `translations`, then copy it unchanged into render JSON. Read `assets/bilingual-overviews.md` for the contract. The toggle covers prose, illustration and technical-diagram labels, and controls while preserving filters, evidence, open sections and saved actions. Python 3 is required at build time; the resulting HTML works offline.

---

## Flags

Recognized flags (passed after the skill name):

| Flag | Effect |
|---|---|
| `--update` | Preserve the `human_notes:` block from any existing `docs/current-state.yaml`; regenerate everything else. |
| `--profile <archetype>` | Force the archetype instead of detecting it (skips archetype confirmation). |
| `--sections <list>` | Override the section proposal non-interactively (comma-separated section ids). |

---

## Guarantees

- **Read-only on production code.** All project writes go exclusively to `docs/`: the inventory, render JSON, `diagrams/*.puml`, `illustrations/*.svg`, and generated HTML.
- **Self-contained HTML.** The `build.sh` script enforces self-containment and fails on any external reference. The resulting HTML has no runtime dependencies on CDNs, remote fonts, or external scripts.
- **No network.** PlantUML diagrams are rendered locally using a locally-installed `plantuml` binary. If `plantuml` is not installed, diagrams are embedded as fenced source blocks inside a `<details>` element — the HTML is still complete. Remote PlantUML servers are never contacted.

---

## Step 0 — Clean vs update

Before doing any analysis, check whether `docs/current-state.yaml` or `docs/project-overview.html` already exist in the target project.

- If neither exists, proceed directly to Step 1.
- If either exists **and** the `--update` flag was not given: **ask the user**:

  > `docs/current-state.yaml` (or `docs/project-overview.html`) already exists. Should I do a **clean overwrite** (regenerate everything from scratch) or an **update** (regenerate but preserve your `human_notes:` block)?
  > Default is clean overwrite. Reply with "update" to preserve notes.

- **Clean:** regenerate everything from scratch; discard the existing files.
- **Update:** read the `human_notes:` block from the existing `docs/current-state.yaml`, regenerate all other content, and write `human_notes:` back into the new YAML unchanged.

Note: the HTML checklist state (checkbox ticks) is stored in the browser's `localStorage` and survives any regeneration regardless of the mode chosen.

---

## Step 1 — Detect project shape

Gather evidence from the repository to classify the project. Look for:

**Entry points**
- `[project.scripts]` in `pyproject.toml` / `setup.cfg`, or `console_scripts` in `setup.py`
- `__main__.py` or `if __name__ == "__main__":` blocks
- `bin/` executables
- Web route decorators (`@app.route`, `@router.get`, `@handler`, etc.)
- Event or queue handler registrations (`@app.on`, `consumer.subscribe`, SQS/SNS handler patterns)
- UI page or component files (`pages/`, `views/`, `components/`, React/Vue/Svelte root files)
- Library exports (`__all__`, public `__init__.py` surface, `index.ts` barrel exports)

**Dependencies**
- Inspect `pyproject.toml`, `requirements*.txt`, `package.json`, `Cargo.toml`, `go.mod`, etc.
- Identify CLI frameworks (Click, Typer, argparse, clap), web frameworks (Flask, FastAPI, Express, Axum), queue clients (Celery, RQ, Kafka, SQS), frontend frameworks (React, Vue, Svelte, SvelteKit, Next.js), or absence of all of the above (library).

**Directory structure**
- `routes/`, `controllers/`, `handlers/`, `pages/` → web or event patterns
- A linear chain of modules with one entry → pipeline
- Public API surface without executables → library

Classify into **exactly one** archetype:

| Archetype | Meaning |
|---|---|
| `cli-pipeline` | One or more CLI commands; data flows through a linear sequence of steps |
| `web-api` | HTTP server exposing routes/endpoints |
| `event-driven` | Responds to events, queues, or pub/sub messages |
| `ui-app` | Frontend application with user-facing flows/pages |
| `library` | Importable package with a public API; no standalone executable |
| `hybrid` | Genuinely combines two or more of the above in a single repo |

If your confidence in the archetype is not high (you found ambiguous or conflicting signals), **show** the user the candidate archetype and the key evidence, and **ask** them to confirm or override before proceeding. Example:

> I detected **cli-pipeline** with moderate confidence based on: `[project.scripts] mailbrain = "mailbrain.cli:main"` and a linear `scan → plan → apply` module chain. No HTTP server or event handlers found.
> Does this look right, or should I use a different archetype?

`--profile <archetype>` bypasses this confirmation.

---

## Step 2 — Propose sections

Based on the confirmed archetype, **propose** a tailored section set and `journey_style`, then **ask the user to approve or add sections** before proceeding. This is always a per-project proposal — not a hardwired default.

Include the visual introduction by default: explain the project's purpose and main flow, then select a few evidenced strengths or pain points. Tailor the number of illustrated cards to the findings (usually 3–6), rather than copying a fixed eight-issue checklist. Preserve C4 and sequence diagrams in the proposed technical section. Respect already approved section choices without asking again.

Suggested defaults by archetype:

| Archetype | Sections | `journey_style` | Notes |
|---|---|---|---|
| `cli-pipeline` | cockpit, journeys, diagrams, detail, next | `pipeline` | diagrams: arch + seq per command + er |
| `web-api` | cockpit, journeys, diagrams, detail | `grid` | journeys = endpoints; diagrams: arch + per-route seq + er; skip next unless useful |
| `event-driven` | cockpit, journeys, diagrams, detail | `handlers` | diagrams: arch + per-event seq |
| `ui-app` | cockpit, journeys, diagrams, detail | `grid` | journeys = user flows; diagrams: arch + per-flow seq |
| `library` | cockpit, journeys, diagrams, detail | `grid` | journeys = API surface; diagrams: arch + er/class; skip sequences |

Also choose **adaptive `cockpit_labels`** that fit the project's maturity and purpose. Examples:

- WIP / early-stage project → `works / stubbed / bites`
- Mature production service → `healthy / partial-or-deprecated / risk`
- Library → `public / experimental / deprecated`

Present the proposal clearly:

> For a **cli-pipeline** project I suggest: sections = [cockpit, journeys, diagrams, detail, next], journey\_style = pipeline, cockpit\_labels = works / stubbed / bites.
> Any changes, or shall I proceed?

Record the approved choice in `presentation.sections`, `presentation.journey_style`, and `presentation.cockpit_labels` in `overview-data.json`.

`--sections <list>` overrides the proposal non-interactively.

---

## Step 3 — Write YAML + PlantUML (FIRST)

Write the canonical inventory, technical diagrams, explanatory illustrations, and render JSON before running the build.

### 3a. `docs/current-state.yaml`

This is the **canonical** artifact. The HTML is a generated view of it; the YAML wins on any conflict.

Include all of the following sections (add others if the project warrants them):

```yaml
meta:
  title: "<project name>"
  generated_at: "<ISO-8601 timestamp>"
  commit: "<short SHA or 'dirty'>"
  working_tree: "clean | dirty"
  archetype: "<archetype>"
  archetype_confidence: "VERIFIED | INFERRED | UNKNOWN"
  tool_version: "<version from pyproject.toml or package.json>"

capabilities:           # What the project does, one item per distinct capability
  - description: "..."
    confidence: VERIFIED | INFERRED | UNKNOWN
    evidence: "path/to/file.py:symbol_or_line"

entry_points:           # CLI commands, HTTP routes, event handlers, or exported symbols
  - name: "..."
    kind: "cli-command | http-route | event-handler | export"
    signature: "..."
    confidence: ...
    evidence: "..."

modules:                # One entry per significant source module
  - name: "..."
    responsibility: "..."
    confidence: ...
    evidence: "..."

domain_entities:        # Data structures that cross module boundaries
  - name: "..."
    fields: [...]
    confidence: ...
    evidence: "..."

persistent_storage:     # Databases, files, caches, object stores
  - kind: "sqlite | postgres | file | s3 | ..."
    role: "..."
    confidence: ...
    evidence: "..."

external_integrations:  # Third-party APIs, services, SDKs
  - name: "..."
    purpose: "..."
    confidence: ...
    evidence: "..."

background_processes:   # Schedulers, workers, daemons (omit section if none)
  - name: "..."
    trigger: "..."
    confidence: ...
    evidence: "..."

config_and_env:         # Configuration files and environment variables
  - name: "..."
    source: "file | env | cli-flag"
    used_in: "..."
    confidence: ...
    evidence: "..."

tests:                  # What the tests actually verify (not what they're named)
  - name: "..."
    verifies: "..."
    confidence: ...
    evidence: "..."

data_flows:             # Named journeys that map to the journeys[] in the JSON
  - id: "..."
    label: "..."
    steps: [...]
    confidence: ...
    evidence: "..."

dead_or_unused_code:    # Only assert VERIFIED after grep confirms zero usages outside definition
  - symbol: "..."
    location: "path:line"
    confidence: VERIFIED | INFERRED
    evidence: "..."

duplicate_or_conflicting:  # Two implementations of the same concern
  - description: "..."
    locations: ["path:line", "path:line"]
    confidence: ...

technical_debt:
  - id: "td-NN"
    note: "..."
    confidence: ...
    evidence: "..."

unresolved_questions:   # Things you could not determine from the code
  - "..."

human_notes: []         # Preserved verbatim on --update; never overwritten by the tool
```

Also include `explainer`, using the schema in `assets/visual-explanation.md`. Copy it into the render JSON without changing the evidence or claims. Each proposal is explicitly labeled as a proposed action, distinct from the current state.

Rules:
- **Every claim** carries `confidence: VERIFIED | INFERRED | UNKNOWN`.
- **Every `VERIFIED` claim** carries an exact `evidence: "path/to/file:symbol_or_line"`.
- Before asserting any symbol as `dead_or_unused_code: VERIFIED`, grep for all usages outside its definition file and confirm zero hits.
- Never present inference as fact. If you infer something, say `INFERRED`.
- Note contradictions (two modules that claim the same responsibility, a config key that is set but never read, etc.).
- Do **not** invent requirements or desired future state. Describe only what the code currently does.

### 3b. `docs/diagrams/*.puml`

Author PlantUML source files for the diagram set chosen in Step 2.

**C4 stays part of the technical view:** use `c4-context.puml` for the system boundary and external actors; `c4-container.puml` for known deployable applications and data stores. Add `c4-component-<scope>.puml` only when that detail helps. Existing C4 or architecture diagrams in `arch.puml` remain supported. Ordinary source modules are components, not automatically deployable C4 containers. Keep uncertain boundaries explicitly inferred.

Use bundled local includes such as `!include <C4/C4_Container>` or plain PlantUML with explicit C4 boundaries. The renderer supports each `c4-*.puml` as its own tab, plus every `seq-*.puml` in the Sequences tab. Illustrations complement these diagrams; they do not substitute for them.

**Do not set colors, fonts, or `backgroundColor` in the `.puml`.** `build.sh` injects a dark theme (`assets/theme.puml`) right after each `@startuml` so diagrams match the dark overview page and never render black-on-black. Write plain PlantUML; use `note ... #<hex>` only for intentional highlights (e.g. a green commit-boundary note, a red failure note).

**`arch.puml`** — component or deployment diagram showing runtime components and their relationships.
- Label each edge with the mechanism (function call, HTTP, SQL, file I/O, queue message).
- Bake evidence into edges: `path:symbol` as a PlantUML note or label on the arrow.
- Style **inferred** relationships distinctly from verified ones (e.g., dashed line + a note `[INFERRED]`).

**`seq-<journey-id>.puml`** — one sequence diagram per primary journey (per `data_flows[]` entry).
- Show transaction/commit boundaries explicitly (a note or divider on the lifeline).
- Show error and retry paths (use `alt` / `else` blocks).
- Bake `path:symbol` evidence into each step label.
- Mark inferred steps with `[INFERRED]` in the label.
- **Sequence syntax gotchas (a bad one drops the whole diagram to the `<details>` source fallback):**
  - Participants must be declared with sequence-legal keywords only: `participant`, `actor`, `boundary`, `control`, `entity`, `collections`, `database`, `queue`. **Never `cloud` or `rectangle`** — those are component-diagram elements and raise "Illegal … (Assumed diagram type: sequence)". Model an external service/API as `participant "Name" as X` (or `queue`), not `cloud`.
  - `alt` / `else` / `group` / `loop` labels must **not start with `-`, `<`, or `>`** — a leading `--` is parsed as a sequence arrow ("Illegal sequence arrow"). Write `else execute (--execute given)`, not `else --execute`; put a word first.
  - After writing seq diagrams, confirm `build.sh` output has no `install a local plantuml` fallback blocks and no `Syntax Error` — either means a diagram failed to render.

**`er.puml`** — entity-relationship or class diagram for domain entities.
- Mark each entity with a stereotype: `<<used>>` / `<<partial>>` / `<<unused>>`.
- Do NOT set `skinparam class` colors, borders, or `backgroundColor` in `er.puml` — `theme.puml` owns the colorblind-safe used/partial/unused palette (Okabe-Ito: blue / orange / gray) and injects it at render. A per-file color block overrides the theme and reintroduces dark-on-dark boxes. Just apply the stereotypes and a `legend` (swatches: used `#12405C`, partial `#5A3A0A`, unused `#2A2F3A`).
- Include field names and types where determinable from the code.
- Bake evidence (`path:symbol`) into entity notes.

### 3c. `docs/illustrations/*.svg`

Author one original, simple, flat-vector illustration for each explanation card. Each SVG has a `viewBox`, meaningful title, readable labels, and a single visual lesson: a flow, comparison, or event timeline. Use the navy/mint/coral/lilac palette and generous space. Keep illustrations self-contained and script-free; use the authoring recipe and example SVGs in `assets/`. On mobile the illustration and its sentence must remain readable. Dense technical labels belong in the expandable detail and C4/sequence diagrams.

### 3d. `docs/overview-data.json`

Derive this from the YAML. It is the render input for `build.sh` — not a separate source of truth.

```json
{
  "meta": {
    "title": "<from YAML>",
    "generated_at": "<from YAML>",
    "commit": "<from YAML>",
    "working_tree": "<from YAML>",
    "archetype": "<from YAML>",
    "archetype_confidence": "<from YAML>"
  },
  "presentation": {
    "language": "nl",
    "languages": ["nl", "en"],
    "sections": ["<approved section list>"],
    "cockpit_labels": {"works": "...", "partial": "...", "bites": "..."},
    "journey_style": "pipeline | grid | handlers"
  },
  "cockpit": {
    "works": ["<one-liner per working capability>"],
    "partial": ["<one-liner per partial/stubbed item>"],
    "bites": ["<one-liner per risk/debt item, e.g. td-NN: description>"]
  },
  "journeys": [
    {"id": "<journey-id>", "label": "<display label>", "confidence": "VERIFIED | INFERRED | UNKNOWN"}
  ],
  "cards": [
    {
      "section": "<section-id>",
      "title": "<card title>",
      "body": "<one or two sentence description>",
      "evidence": "<path:symbol>",
      "confidence": "VERIFIED | INFERRED | UNKNOWN",
      "risk": "none | low | medium | high",
      "modules": ["<module-name>"],
      "journeys": ["<journey-id>"]
    }
  ],
  "sections_meta": [
    ["<section-id>", "<Section Title>", "<one-line description>"]
  ],
  "next_actions": ["<actionable next step>"]
}
```

`confidence ∈ {VERIFIED, INFERRED, UNKNOWN}`. `risk ∈ {none, low, medium, high}`. Diagrams are **not** embedded in the JSON — they live as `.puml` files under `docs/diagrams/` and are spliced in by `build.sh`.

Add the required-for-new-reports `explainer` object from `assets/visual-explanation.md` alongside the existing fields. Illustration references are filenames without `.svg`; `diagram_ids` are technical diagram filenames without `.puml`. The builder embeds the SVGs locally. Keep the existing `cards`, `journeys`, `sections_meta`, and `next_actions` populated so the technical explorer stays useful.

---

## Step 4 — Render HTML (SECOND)

After the inventory, diagrams, illustrations, and render JSON are written, run the build:

```bash
bash "$SKILL_DIR/assets/build.sh" "<project_root>"
```

Where:
- `$SKILL_DIR` is the absolute path to this skill's directory (the one containing this `SKILL.md` and the `assets/` folder).
- `<project_root>` is the absolute path to the target repository root (the project whose `docs/` holds the files just written).

Then report to the user:

1. The output path (`<project_root>/docs/project-overview.html`).
2. Whether diagrams rendered as **inline SVG** (local `plantuml` found and succeeded) or fell back to **`.puml` source** embedded in `<details>` blocks.
3. If they fell back, tell the user how to enable rendering:

   > Diagrams rendered as source (no local `plantuml` found). To get inline SVG diagrams, install PlantUML locally:
   > - macOS: `brew install plantuml`
   > - Debian/Ubuntu: `sudo apt install plantuml`
   > - Other: see https://plantuml.com/starting
   >
    > Then re-run the skill (or just re-run `build.sh`) — the HTML is complete and fully self-contained without it.

Before reporting completion, inspect the generated page at desktop and phone widths. Open an explanation, follow its C4/sequence links, and check filtering and saved actions. Technical diagrams keep their natural size in a scrollable pane and have zoom controls. If browser tooling is unavailable, state that only build checks were performed. Report missing illustrations or diagram fallbacks explicitly.

Check both NL and EN, including diagram labels and a changed checklist item after switching. The build rejects missing authored translations. Identity entries are appropriate for shared names and protocol labels; keep evidence paths, code, IDs and confidence values unchanged. Long translated SVG labels must still fit their diagrams. Legacy single-language input remains supported without a toggle.

## Quick reference

| Layer | Contents |
|---|---|
| First glance | Plain-language purpose, headline, summary and evidence basis |
| Illustrated cards | One lesson per image, one takeaway, optional clearly labeled proposal |
| Under each image | Native expandable explanation, exact evidence, confidence and diagram links |
| Technical view | Cockpit, journeys, C4, sequences, data model, searchable inventory and saved actions |

## Common mistakes

- A new color scheme alone is not a visual explanation: supply actual `explainer` content and authored SVGs.
- A verified code path is not a production measurement: show `basis` alongside confidence.
- A friendly metaphor must preserve the mechanism: retain ordering, commit boundaries and uncertainty in the technical view.
- Technical diagrams remain readable through scrolling and zoom; shrinking a dense C4 or sequence diagram into a postcard loses its value.

---

## References

- **`assets/example-current-state.yaml`** — reference shape for `docs/current-state.yaml`. Follow this structure exactly; add sections as needed for the project.
- **`assets/example-overview-data.json`** — reference shape for `docs/overview-data.json`. Every field shown is required; `cards[]` and `journeys[]` are arrays of the objects shown.
- **`assets/visual-explanation.md`** — explanation schema, evidence labels, and illustration recipe.
- **`assets/bilingual-overviews.md`** — canonical translation dictionaries, coverage and switch behavior.
- **`assets/example-illustrations/`** and **`assets/example-diagrams/`** — one complete example of the visual and technical layers together.
- `docs/current-state.yaml` is the **canonical source of truth**. The HTML is a generated view. If they ever disagree, the YAML is correct.
