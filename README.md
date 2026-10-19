# ak-ai-skills (Ahold Delhaize)

[Agent Skills](https://agentskills.io/specification) that carry Ahold Delhaize
context, maintained by Arno Koehler.

Harness-neutral source. Installed into Claude Code and OpenCode through
[APM](https://microsoft.github.io/apm/).

## Skills

| Skill | Purpose | Owner | Tested on |
|---|---|---|---|
| `verify-and-test-project` | Run a project's tests the way CI would, including Stratos component and integration profiles | @arnokoehler-ah | Claude Code |
| `ah-project-design-visualizer` | Visual project overview with NL/EN switching, evidence, C4, sequences, filters and saved actions | @arnokoehler-ah | OpenCode; Chromium build/browser checks |

## Install

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
    - arnokoehler-ah/ak-ai-skills#v1.1.0
```

```bash
apm install
```

APM deploys to `.claude/skills/<name>/` and `.agents/skills/<name>/`.

To install only the AH visualizer globally:

```bash
apm install --global --target claude,opencode 'arnokoehler-ah/ak-ai-skills/skills/ah-project-design-visualizer#v1.1.0'
```

Global installs use `~/.claude/skills` and `~/.config/opencode/skills`. Authenticate
with a GitHub account that can read this private repository.

The visualizer requires Python 3 at build time and uses local PlantUML for rendered
diagrams. Its final HTML works offline. A source-only diagram fallback is available
when PlantUML is absent. New reports include NL/EN switching and fail the build if
authored translations are missing.

## Visualizer source

`ah-project-design-visualizer` is a self-contained, renamed distribution of the
portable `project-design-visualizer` from `arnokoehler/ak-ai-skills`. Installing this
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
