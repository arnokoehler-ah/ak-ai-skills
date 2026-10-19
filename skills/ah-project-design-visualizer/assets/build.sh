#!/usr/bin/env bash
# build.sh <project_root>
# Splice overview-data.json + rendered diagrams into template.html, guaranteeing
# a self-contained project-overview.html. Pure shell/awk. Never hits the network.
set -eu

ROOT="${1:-.}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$SKILL_DIR/assets/template.html"
DATA="$ROOT/docs/overview-data.json"
DIAG_DIR="$ROOT/docs/diagrams"
ILL_DIR="$ROOT/docs/illustrations"
OUT="$ROOT/docs/project-overview.html"

[ -f "$TEMPLATE" ] || { echo "template not found: $TEMPLATE" >&2; exit 2; }
[ -f "$DATA" ] || { echo "overview-data.json not found: $DATA" >&2; exit 2; }

esc_html() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

diagram_id() {
  local LC_ALL=C
  case "$1" in
    *[!a-zA-Z0-9_-]*) printf 'encoded:'; printf '%s' "$1" | od -An -tx1 | tr -d ' \n' ;;
    *) printf '%s' "$1" ;;
  esac
}

DIAG_TMP="$(mktemp)"
ILL_TMP="$(mktemp)"
DATA_TMP="$(mktemp)"
trap 'rm -f "$DIAG_TMP" "$ILL_TMP" "$DATA_TMP"' EXIT
sed 's|</|<\\/|g' "$DATA" >"$DATA_TMP"

_themed_puml() {  # <puml_path> -> stdout: puml with the dark theme injected after @startuml
  local puml="$1" first theme="$SKILL_DIR/assets/theme.puml"
  IFS= read -r first <"$puml" || first=""
  case "$first" in
    @startuml*)
      if [ -f "$theme" ]; then
        printf '%s\n' "$first"; cat "$theme"; tail -n +2 "$puml"
      else cat "$puml"; fi ;;
    *) cat "$puml" ;;
  esac
}

render_one() {  # <puml_path> -> stdout: SVG or <details> fallback
  local puml="$1"
  if command -v plantuml >/dev/null 2>&1; then
    local svg
    if svg="$(_themed_puml "$puml" | plantuml -tsvg -pipe 2>/dev/null)" && [ -n "$svg" ]; then
      # Keep PlantUML's natural pixel size (width/height attr + inline style) so
      # wide/tall diagrams render full-size and the .dgwrap scroll viewport
      # (overflow:auto + max-height) scrolls to them, instead of shrinking to fit
      # the pane (which made large diagrams unreadably small). Strip only the
      # PlantUML SRC/MD5 source comments.
      printf '%s' "${svg#*<svg}" | sed '1s/^/<svg/' \
        | sed -e 's/<!--SRC=[^>]*>//g' -e 's/<!--MD5=[^>]*>//g'
      return
    fi
  fi
  printf '<details class="puml-fallback"><summary>PlantUML source (install a local plantuml to render)</summary><pre>'
  esc_html <"$puml"
  printf '</pre></details>'
}

tabs=""; panes=""; first=1
add_pane() {  # <pane_id> <label> <body_html>
  local id="$1" label="$2" body="$3" on="" pon=""
  [ "$first" = "1" ] && { on=" class='on'"; pon=" on"; first=0; }
  tabs="$tabs<button data-pane=\"$id\"$on>$label</button>"
  panes="$panes<div class=\"dgpane$pon\" id=\"pane-$id\"><div class=\"dgwrap\" tabindex=\"0\"><div class=\"diagram-canvas\">$body</div></div></div>"
}

if [ -d "$DIAG_DIR" ]; then
  [ -f "$DIAG_DIR/arch.puml" ] && add_pane "arch" "Architecture / C4" "<section id=\"diagram-arch\">$(render_one "$DIAG_DIR/arch.puml")</section>"
  c4_seen="|"
  for f in "$DIAG_DIR"/c4-context.puml "$DIAG_DIR"/c4-container.puml "$DIAG_DIR"/c4-*.puml; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .puml)"
    case "$c4_seen" in *"|$name|"*) continue;; esac
    c4_seen="$c4_seen$name|"
    id="$(diagram_id "$name")"
    case "$name" in
      c4-context) label="C4 · Context" ;;
      c4-container) label="C4 · Containers" ;;
      *) label="C4 · $(printf '%s' "${name#c4-}" | esc_html)" ;;
    esac
    add_pane "$id" "$label" "<section id=\"diagram-$id\">$(render_one "$f")</section>"
  done
  seqbody=""
  for f in "$DIAG_DIR"/seq-*.puml; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .puml)"
    id="$(diagram_id "$name")"
    label="$(printf '%s' "${name#seq-}" | esc_html)"
    seqbody="$seqbody<section id=\"diagram-$id\"><h3>$label</h3>$(render_one "$f")</section>"
  done
  [ -n "$seqbody" ] && add_pane "seq" "Sequences" "$seqbody"
  [ -f "$DIAG_DIR/er.puml" ] && add_pane "er" "Data model" "<section id=\"diagram-er\">$(render_one "$DIAG_DIR/er.puml")</section>"
fi

if [ -n "$tabs" ]; then
  printf '<div class="diagrams"><div class="dgtabs">%s</div>%s</div>' "$tabs" "$panes" >"$DIAG_TMP"
else
  : >"$DIAG_TMP"
fi

if [ -d "$ILL_DIR" ]; then
  for f in "$ILL_DIR"/*.svg; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .svg)"
    case "$name" in *[!a-zA-Z0-9_-]*) echo "Invalid illustration filename: $name" >&2; exit 2;; esac
    printf '<template id="illustration-%s">' "$name" >>"$ILL_TMP"
    sed -e 's/<?xml[^>]*?>//g' "$f" >>"$ILL_TMP"
    printf '</template>\n' >>"$ILL_TMP"
  done
fi

python3 "$SKILL_DIR/assets/validate-translations.py" "$DATA" "$DIAG_TMP" "$ILL_TMP"
mkdir -p "$(dirname "$OUT")"
DATA="$DATA_TMP" DIAG="$DIAG_TMP" ILL="$ILL_TMP" UI="$SKILL_DIR/assets/interface-translations.json" LANG_SWITCH="$SKILL_DIR/assets/language-switch.js" awk '
  { line=$0; sub(/^[ \t]+/,"",line); sub(/[ \t]+$/,"",line) }
  line=="/*DATA*/"    { system("cat \"" ENVIRON["DATA"] "\""); next }
  line=="<!--DIAGRAMS-->" { system("cat \"" ENVIRON["DIAG"] "\""); next }
  line=="<!--ILLUSTRATIONS-->" { system("cat \"" ENVIRON["ILL"] "\""); next }
  line=="/*INTERFACE_TRANSLATIONS*/" { system("cat \"" ENVIRON["UI"] "\""); next }
  line=="/*LANGUAGE_SWITCH*/" { system("cat \"" ENVIRON["LANG_SWITCH"] "\""); next }
  { print }
' "$TEMPLATE" >"$OUT"

if grep -Eio 'https?://[^"'"'"' )]*' "$OUT" | grep -v 'www.w3.org' | grep -q .; then
  echo "SELF-CONTAINMENT FAILURE: external URL in $OUT" >&2
  grep -Eio 'https?://[^"'"'"' )]*' "$OUT" | grep -v 'www.w3.org' | sort -u >&2
  exit 1
fi
for pat in 'src=' '<link' '@import' 'cdn'; do
  if grep -iq "$pat" "$OUT"; then
    echo "SELF-CONTAINMENT WARNING: found '$pat' in $OUT" >&2
    exit 1
  fi
done

echo "wrote $OUT"
