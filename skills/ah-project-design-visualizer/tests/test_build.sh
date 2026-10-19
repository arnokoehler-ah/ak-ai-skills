#!/usr/bin/env bash
# Smoke tests for build.sh. Run: bash tests/test_build.sh
set -u
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$SKILL_DIR/assets/build.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail=0
check() { if [ "$1" != "0" ]; then echo "FAIL: $2"; fail=1; else echo "ok: $2"; fi; }

mkdir -p "$TMP/docs/diagrams"
cp "$SKILL_DIR/assets/example-overview-data.json" "$TMP/docs/overview-data.json"
cp "$SKILL_DIR/tests/diagrams/arch.puml" "$TMP/docs/diagrams/arch.puml"

PATH="/usr/bin:/bin" bash "$BUILD" "$TMP" >/dev/null 2>&1
check $? "build succeeds without plantuml"
OUT="$TMP/docs/project-overview.html"
grep -q "MailBrain" "$OUT"; check $? "output contains title from DATA"
grep -q "WERKT" "$OUT"; check $? "output contains adaptive cockpit label"
grep -q "<details" "$OUT"; check $? "diagram falls back to <details> puml source"
if grep -Eio 'https?://[^"'"'"' )]*' "$OUT" | grep -v 'www.w3.org' | grep -q .; then
  check 1 "output is self-contained"; else check 0 "output is self-contained"; fi

chmod +x "$SKILL_DIR/tests/fake-plantuml"
STUBDIR="$TMP/stub"; mkdir -p "$STUBDIR"; cp "$SKILL_DIR/tests/fake-plantuml" "$STUBDIR/plantuml"
PATH="$STUBDIR:/usr/bin:/bin" bash "$BUILD" "$TMP" >/dev/null 2>&1
check $? "build succeeds with plantuml stub"
grep -q "STUBSVGMARKER" "$OUT"; check $? "diagram embeds rendered SVG when plantuml present"
grep -q "QUJDREVGMTIzNA==" "$OUT" && check 1 "PlantUML SRC metadata stripped from output" || check 0 "PlantUML SRC metadata stripped from output"
# and confirm the stub-path output still passes self-containment (no src= from the SRC comment)
if grep -iq 'src=' "$OUT"; then check 1 "stub svg output has no residual src="; else check 0 "stub svg output has no residual src="; fi

PATH="/usr/bin:/bin" bash "$BUILD" "$TMP" >/dev/null 2>&1
cp "$OUT" "$TMP/first.html"
PATH="/usr/bin:/bin" bash "$BUILD" "$TMP" >/dev/null 2>&1
diff -q "$TMP/first.html" "$OUT" >/dev/null; check $? "two clean builds are identical"

exit $fail
