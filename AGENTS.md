# Personal AH Skills

- Use `ak-ah-` for skill directory and frontmatter names in this collection. Private AK skills and shared team skills have different source repositories and prefixes.
- Update current commands, package manifests, lockfile package names and workflow paths when renaming a skill. Preserve paths in dated upstream provenance records.
- `ak-ah-project-design-visualizer` is synchronized from the private canonical visualizer source; keep its recorded source revision and file hashes consistent.
- Run `bash scripts/validate-skills.sh` and the affected skill tests before committing. The visualizer has shell/browser checks; presentation skills use Node 22 and `npm test`.
