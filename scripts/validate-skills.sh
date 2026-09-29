#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

exec python3 - <<'PY'
import pathlib
import re
import sys

FRONTMATTER_LIMIT = 1024
DESCRIPTION_SOFT_LIMIT = 500
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

errors = []
warnings = []

skills_root = pathlib.Path("skills")
if not skills_root.is_dir():
    sys.exit("skills/ directory not found")

for stray in pathlib.Path(".").rglob(".DS_Store"):
    errors.append(f"{stray}: committed .DS_Store")

skill_dirs = sorted(p for p in skills_root.iterdir() if p.is_dir())
if not skill_dirs:
    sys.exit("skills/ contains no skill directories")

for skill_dir in skill_dirs:
    manifest = skill_dir / "SKILL.md"
    if not manifest.is_file():
        errors.append(f"{skill_dir}: missing SKILL.md")
        continue

    text = manifest.read_text(encoding="utf-8")
    if not text.startswith("---"):
        errors.append(f"{manifest}: no YAML frontmatter")
        continue

    _, frontmatter, *_rest = text.split("---", 2)
    if not _rest:
        errors.append(f"{manifest}: unterminated frontmatter")
        continue

    stripped = frontmatter.strip()
    if len(stripped) > FRONTMATTER_LIMIT:
        errors.append(
            f"{manifest}: frontmatter is {len(stripped)} chars, limit is {FRONTMATTER_LIMIT}"
        )

    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    if not name_match:
        errors.append(f"{manifest}: frontmatter has no name field")
    else:
        declared = name_match.group(1).strip().strip("\"'")
        if declared != skill_dir.name:
            errors.append(
                f"{manifest}: name '{declared}' does not match directory '{skill_dir.name}'"
            )
        if not NAME_PATTERN.match(declared):
            errors.append(f"{manifest}: name '{declared}' is not lowercase kebab-case")

    description_match = re.search(
        r"^description:\s*(.*?)(?=\n[A-Za-z_-]+:|\Z)", frontmatter, re.MULTILINE | re.DOTALL
    )
    if not description_match:
        errors.append(f"{manifest}: frontmatter has no description field")
    else:
        description = " ".join(description_match.group(1).split())
        if not description:
            errors.append(f"{manifest}: description is empty")
        elif len(description) > DESCRIPTION_SOFT_LIMIT:
            warnings.append(
                f"{manifest}: description is {len(description)} chars, prefer under {DESCRIPTION_SOFT_LIMIT}"
            )

for warning in warnings:
    print(f"WARN  {warning}")
for error in errors:
    print(f"FAIL  {error}")

print(f"\nChecked {len(skill_dirs)} skills: {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
PY
