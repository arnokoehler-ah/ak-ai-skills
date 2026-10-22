# Safe, repeatable local tooling

## Read-only preflight

`bash scripts/doctor.sh` reports Python, Node, package dependencies, Java, Graphviz, PlantUML, Office rendering and Poppler. The PlantUML check actually renders the bundled C4 standard library under `SANDBOX`; discovering a binary alone is insufficient. `ready`, `missing` and `broken` are distinct outcomes. The doctor never installs, elevates privileges or edits system configuration.

Supported overrides point to an **existing** installation: `NODE_BIN`, `PYTHON_BIN`, `PLANTUML_BIN`. Quote paths. Do not source arbitrary shell startup files or choose an unrelated binary just to obtain a green check.

Before proposing a new installation, check the user's existing version-manager locations read-only (for example their NVM or Volta installation for Node). Set the explicit override to a suitable existing binary rather than installing a second copy because a non-login shell has a shorter PATH.

## Installation approval

When something is missing or broken, present a short installation proposal naming:

1. The capability needed and why.
2. The exact package or official release, source and version to install.
3. Installation scope, dependencies, required privileges and expected changes.
4. The verification command to run afterwards.

Obtain explicit approval before executing it. Prefer the user's already trusted package manager. Read-only discovery such as `brew info` or `apt-cache policy` can identify a concrete version first. For a directly downloaded JAR, use an official pinned release and verify its published checksum before execution. Do not use `curl | sh`, automatic `sudo`, arbitrary mirrors or remote rendering as a shortcut.

Package dependencies are local to the skill: after approval, `npm --prefix "$SKILL_DIR" ci --ignore-scripts` uses its lockfile and suppresses lifecycle scripts. Node >=22 and Python >=3.10 are required. Native animation authoring uses Python's standard library and the bundled timing templates; Office is not required to create the animation file.

## C4 renderer

`bash scripts/render-diagrams.sh MODEL.json NEW_OUTPUT_DIR` accepts a bounded **context model**, not arbitrary `.puml`:

- `title`;
- 1–12 nodes: `id`, `type` (`person`, `system`, `external_system`), `title`, `description`;
- up to 24 `relationships`: `from`, `to`, `label`.

See `examples/context.json`. Labels are plain text, without markup, URLs, directives or line breaks. The tool emits the fixed local `!include <C4/C4_Context>`, validates aliases/relationships, uses SANDBOX and timeouts, and checks SVG references. Embedded PNG/JPEG sprites are self-contained; external references and active SVG content are rejected.

PlantUML >=1.2021.0 with its C4 standard library is required; the actual render is the compatibility check. A successful run writes `context.puml`, `context.svg`, `context.png`, and `status.json`. If PlantUML is missing, exit 2 leaves source plus `state: missing`; broken rendering exits 1 with source and diagnosis. Neither outcome claims an image was rendered. Existing output directories are preserved.

## Verification

`bash scripts/verify.sh DECK.pptx` checks ZIP structure, unique shape/timing IDs, macro absence and valid animation targets. It does not assess visual fit or animation aesthetics.

`python3 scripts/render-preview.py DECK.pptx NEW_PREVIEW_DIR --renderer powerpoint` uses installed PowerPoint on macOS; `--renderer libreoffice` uses installed LibreOffice. Both require Poppler's `pdftoppm`. The preview is derived from the **actual PPTX** and contains PDF, PNGs, a gallery and a source hash.

Inspect every final slide and manually or programmatically exercise the native slideshow clicks. Report a missing verification capability explicitly. Record tool versions with the delivery so a colleague can reproduce the run.
