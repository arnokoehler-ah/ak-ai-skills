---
name: verify-and-test-project
description: Run tests and verification for any project the way CI would. Branches on project ownership — Ahold/Albert Heijn projects have known Stratos quirks (component/integration profiles, *CT/*IT suffixes); other projects fall back to project-type defaults (Maven, Gradle, npm, Cargo, Go, Python).
---

# verify-and-test-project

Runs the full test + verify pipeline locally the way CI runs it. The first decision is whether this is an Ahold/Albert Heijn (Stratos) project — those have quirks that `mvn test` alone does not catch.

## Step 1 — Identify the project

Look at the working directory for build files and obvious ownership signals:

| File | Tool | AH hints |
|---|---|---|
| `pom.xml` | Maven | `com.ahold.*` groupId, Stratos parent, `ah.technology` coords |
| `build.gradle(.kts)` | Gradle | `com.ahold.*` namespaces |
| `package.json` | Node | usually not AH |
| `Cargo.toml` | Rust | not AH |
| `go.mod` | Go | not AH |
| `pyproject.toml` / `setup.py` | Python | not AH |

If the project is a Maven (or occasionally Gradle) build and you see clear AH signals (Stratos, `com.ahold`, `*CT.kt`, `*IT.kt` test files), **ask the user to confirm**:

> "This looks like an Ahold/AH project (Stratos / com.ahold). Should I treat it as one and apply AH-specific test quirks?"

If unclear, ask before assuming. Don't apply the AH branch to a private project just because it's Maven.

## Container runtime (podman on this machine)

This user runs **podman** as their container engine, with `docker` / `docker-compose` calls routed to it via the docker-compat socket. Anything that uses Testcontainers (AH's `*CT`/`*IT` profiles, plus many non-AH projects) needs the runtime reachable before tests will pass.

**Probe before running container-dependent tests:**

```bash
podman machine list --format '{{.Name}} {{.Running}}'
echo "DOCKER_HOST=$DOCKER_HOST"
docker info >/dev/null 2>&1 && echo "runtime ok" || echo "runtime not reachable"
```

- If the machine row isn't `true`, run `podman machine start` and wait for it (~10–20s).
- If `DOCKER_HOST` is empty in the Bash call, export it:
  ```bash
  export DOCKER_HOST=$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}' | sed 's|^|unix://|')
  ```
- **`DOCKER_HOST` does not persist between Bash tool calls.** Either re-export in every call that talks to the runtime, or chain commands with `&&` in a single call. The user's shell rc usually sets it, but the Bash tool spawns fresh non-interactive shells that may not source it.
- For projects with a `docker-compose.yml`, `docker-compose up -d` / `docker-compose down` work — podman supplies docker-cli compatibility.
- If the runtime can't be brought up, stop and surface that to the user. Don't try to skip Testcontainers-backed phases — they'll fail in confusing ways downstream.

## Step 2a — AH branch (Stratos / Ahold projects)

Stratos projects split tests three ways. CI runs each one in a separate matrix job — running only `mvn test` locally misses ⅔ of the suite.

| Suffix | Annotation | Local command |
|---|---|---|
| `*Test.kt` | none / standard | `mvn test` (surefire) |
| `*CT.kt` | `@Tag(TestProfiles.COMPONENT_TEST)` | `mvn --no-transfer-progress -DskipTests=true verify -P component` |
| `*IT.kt` | `@Tag(TestProfiles.INTEGRATION_TEST)` | `mvn --no-transfer-progress -DskipTests=true verify -P integration` |

Run all three the user has in the repo, in this order. Use `-pl <module>` if a single module is in scope. After each, surface failures immediately — don't bury them in later steps.

Common pitfalls to check up front:
- **Container runtime required for `*CT` / `*IT`** — Testcontainers spins up real Postgres/Kafka/etc. See the *Container runtime* section above and probe podman + `DOCKER_HOST` + `docker info` before kicking off these phases.
- **jOOQ generated code** — if a migration changed and the user didn't regenerate, compilation fails with cryptic errors. If you see `unresolved reference` against `tables.references.*`, suggest `./dev/scripts/jooq.sh` (only if such a script exists in the repo).
- **Detekt may not be wired locally** — CLAUDE.md/READMEs often mention `mvn detekt:check`, but the plugin prefix isn't always registered in the local pom. If it fails with `No plugin found for prefix 'detekt'`, note it and skip — CI runs it separately via a different mechanism.
- **CT/IT failures absent from `mvn test`** — when a unit test is green but the equivalent CT is red, the cause is almost always something that only the Spring context exposes (cache key drift, `@CacheEvict` mismatch, missing bean, etc.). Don't dismiss the CT failure as "flaky".

Stop at the first failing phase (don't run integration if component is red) unless the user asks for the whole picture.

## Step 2b — Generic branch (non-AH)

Pick the obvious "run everything CI would" command for the detected build tool:

| Tool | Command |
|---|---|
| Maven | `mvn verify` |
| Gradle | `./gradlew check` (or `gradle check` if no wrapper) |
| npm | `npm test` (or `npm run test:ci` if present in scripts) |
| pnpm | `pnpm test` |
| Yarn | `yarn test` |
| Cargo | `cargo test` |
| Go | `go test ./...` |
| Python (pytest) | `pytest` (or `python -m pytest`) |
| Python (tox) | `tox` |

Inspect `package.json` `scripts` / `Makefile` / `justfile` for a project-specific `test`, `ci`, or `verify` target before falling back to the default — many projects wrap their CI command. Ask the user if multiple plausible targets exist.

If none of these apply, ask the user how their CI runs tests.

## Step 3 — Report

Keep the summary tight: which phases ran, pass/fail count per phase, and if anything failed, the failing test name + the actual assertion (not the stack trace). Don't list every passing test.

If everything's green and there's nothing else to do, say so in one sentence — don't pad.

## What this skill is NOT

- **Not** a "start the app and poke at endpoints" skill — for that, see project-level skills like `/validate-project`.
- **Not** a linting/formatting check unless the project's CI runs it as part of `verify`/`check` (Maven's `verify` may include it; standalone `mvn detekt:check` is not run here).
- **Not** a CI replacement — if CI fails on something that passes locally, the cause is usually a phase you skipped (most often: the `*CT` / `*IT` profiles on AH projects). Don't suppress the CI failure to make local green.
