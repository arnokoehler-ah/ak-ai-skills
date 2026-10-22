#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE" ]]; then
  printf '%s\n' 'Node 22+ is missing. Run doctor.sh and approve an installation plan, or set NODE_BIN to an existing installation.' >&2
  exit 2
fi
exec "$NODE" "$ROOT/build.mjs" "$@"
