# ak-ai-skills (Ahold Delhaize)

[Agent Skills](https://agentskills.io/specification) that carry Ahold Delhaize
context, maintained by Arno Koehler.

Harness-neutral source. Installed into Claude Code and OpenCode through
[APM](https://microsoft.github.io/apm/).

## Skills

| Skill | Purpose | Owner | Tested on |
|---|---|---|---|
| `ak-ah-verify-and-test-project` | Run a project's tests the way CI would, including Stratos component and integration profiles | @arnokoehler-ah | Claude Code |
| `ak-ah-project-design-visualizer` | Visual project overview with NL/EN switching, evidence, C4, sequences, filters and saved actions | @arnokoehler-ah | OpenCode; Chromium build/browser checks |
| `ak-ah-business-slides` | Editable AH business PowerPoint decks, native charts, speaker notes and rendered slide previews | @arnokoehler-ah | Node 22; Microsoft PowerPoint 16.114 on macOS |
| `ak-ah-architecture-decision-slides` | Evidence-led MT/CTO architecture decisions, stable diagrams, local C4 tooling and native click-controlled PowerPoint animations | @arnokoehler-ah | Node/Python; local PlantUML; PowerPoint read-back/playback |

## Install

Version 2.0.0 gives every skill in this collection an `ak-ah-` prefix. Update old
leaf dependencies and invocation names when upgrading. Historical upstream
provenance records retain the names and paths that existed at the recorded revision.

```bash
brew install apm
```

In the consuming repository:

```yaml
name: my-project
version: 1.0.0
targets:
  - claude
  - opencode
dependencies:
  apm:
    - arnokoehler-ah/ak-ai-skills#v2.0.0
```

```bash
apm install
```

APM deploys to `.claude/skills/<name>/` and `.agents/skills/<name>/`.

To install only the AH visualizer globally:

```bash
apm install --global --target claude,opencode 'arnokoehler-ah/ak-ai-skills/skills/ak-ah-project-design-visualizer#v2.0.0'
```

Global installs use `~/.claude/skills` and `~/.config/opencode/skills`. This
repository is public.

### AH Business PowerPoint

Install only the presentation skill:

```bash
apm install --global --target claude,opencode 'arnokoehler-ah/ak-ai-skills/skills/ak-ah-business-slides#v2.0.0'
```

Ask your agent: **“Gebruik ak-ah-business-slides om een bewerkbare AH-presentatie
te maken over dit voorstel.”** English briefs work too. The skill creates native
PowerPoint text, shapes and charts from a documented JSON source, with speaker
notes and an explicit decision or takeaway. It is an AH-inspired design, not an
official corporate template.

Requirements: Node 22+, Python 3.10+, and, for visual verification, LibreOffice
or Microsoft PowerPoint on macOS plus Poppler (`pdftoppm`). The generator itself
does not require Office. If a renderer is unavailable, the agent reports that the
editable draft has not been visually verified.

Try the bundled example from `skills/ak-ah-business-slides`:

```bash
npm ci
npm run example
python3 scripts/render-preview.py output/demo.pptx output/preview --renderer libreoffice
```

Use `--renderer powerpoint` on macOS with PowerPoint. The new preview directory
contains a PDF, one PNG per slide and `index.html`. The JSON source and local
images travel with your deck; generated project decks belong outside this skill.

The visualizer requires Python 3 at build time and uses local PlantUML for rendered
diagrams. Its final HTML works offline. A source-only diagram fallback is available
when PlantUML is absent. New reports include NL/EN switching and fail the build if
authored translations are missing.

## Architecture decisions for MT and CTO

```bash
apm install --global --target claude,opencode 'arnokoehler-ah/ak-ai-skills/skills/ak-ah-architecture-decision-slides#v2.0.0'
```

Ask: **“Gebruik ak-ah-architecture-decision-slides om dit architectuurbesluit voor het
MT te onderbouwen, inclusief alternatieven en een klikgestuurde uitleg.”**

The skill combines a business decision story, same-level before/after views,
baseline alternatives, stable native interaction diagrams, tables and callouts.
It distinguishes source claims, hypotheses, proposals and examples. A synthetic
six-slide demo and a separate C4 context model are included.

- [Editable demo](skills/ak-ah-architecture-decision-slides/examples/demo.pptx)
- [Animated demo](skills/ak-ah-architecture-decision-slides/examples/demo-animated.pptx)
- [Slideshow](skills/ak-ah-architecture-decision-slides/examples/demo.ppsx)
- [PDF handout](skills/ak-ah-architecture-decision-slides/examples/demo.pdf)

Node 22+ and Python 3.10+ are required. Animation authoring is portable and does
not require Office; generated `.pptx`/`.ppsx` contain native effects and no macros.
PowerPoint is the tested playback target. Visual verification uses installed
PowerPoint on macOS or LibreOffice plus Poppler.

The doctor diagnoses existing tools and actually smoke-tests local C4 rendering.
It **never installs software**. Missing dependencies require an explicit approved
installation plan. C4 rendering accepts bounded plain-label JSON, uses local
PlantUML under SANDBOX and rejects remote references; it keeps `.puml` source and
an honest missing/broken status when rendering is unavailable.

After approved dependency setup, from the skill folder:

```bash
bash scripts/doctor.sh
npm ci --ignore-scripts
npm run example
python3 scripts/animate.py output/demo/presentation.pptx output/demo/animation-plan.json output/demo/animated.pptx --show output/demo/animated.ppsx
bash scripts/verify.sh output/demo/animated.pptx
bash scripts/render-diagrams.sh examples/context.json output/context
```

Output directories must be new. The complete schema, installation policy,
narrative guidance and playback checks live under the skill's `references/`.

## Visualizer source

`ak-ah-project-design-visualizer` is a self-contained, renamed distribution of the
portable `ak-project-design-visualizer` from `arnokoehler/ak-ai-skills`. Installing this
AH package does not require access to the personal repository. The implementation
is synchronized with the canonical source; `UPSTREAM.json` records its revision
and file hashes. Make shared changes in the canonical source and regenerate this
copy with its `scripts/sync-visualizer.py` command.

The distinct skill names allow both packages to be installed together. The AH
distribution contains the same generic renderer and example, not project reports.

## Scope

This repository is an incubator, not a CTP-owned collection. Skills here are
candidates for promotion to a tech-area or team-owned repository once an owner
accepts ongoing maintenance, per the CTP ownership model in ENBL-36625.

Portable canonical sources live in `arnokoehler/ak-ai-skills`. The visualizer is
also distributed here under the AH-prefixed name for independent installation.
Skill names remain disjoint across the two packages.

Skills that produce assessments of named individuals are not published here.

## Contains no secrets

Skills in this repository describe development conventions and project-analysis
workflows. No credentials, customer data, project reports or internal hostnames
are included.
