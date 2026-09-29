# ak-ai-skills (Ahold Delhaize)

[Agent Skills](https://agentskills.io/specification) that carry Ahold Delhaize
context, maintained by Arno Koehler.

Harness-neutral source. Installed into Claude Code and OpenCode through
[APM](https://microsoft.github.io/apm/).

## Skills

| Skill | Purpose | Owner | Tested on |
|---|---|---|---|
| `verify-and-test-project` | Run a project's tests the way CI would, including Stratos component and integration profiles | @arnokoehler-ah | Claude Code |

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
    - arnokoehler-ah/ak-ai-skills
```

```bash
apm install
```

APM deploys to `.claude/skills/<name>/` and `.agents/skills/<name>/`.

## Scope

This repository is an incubator, not a CTP-owned collection. Skills here are
candidates for promotion to a tech-area or team-owned repository once an owner
accepts ongoing maintenance, per the CTP ownership model in ENBL-36625.

Portable skills without Ahold Delhaize context live in `arnokoehler/ak-ai-skills`
instead. The two repositories share a repository name, so their skill sets are
kept disjoint: no skill name appears in both.

Skills that produce assessments of named individuals are not published here.

## Contains no secrets

Skills in this repository describe build and test conventions only. No
credentials, no customer data, no internal hostnames. Keep it that way.
