#!/usr/bin/env bash
#
# Packages the extension into an installable .xpi for Firefox.
#
# Usage: ./scripts/build-xpi.sh
# Re-running overwrites the previous artifact.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="dist"
OVERRIDES="scripts/firefox.json"

command -v zip >/dev/null 2>&1 || {
  echo "error: 'zip' is not installed (try: sudo apt install zip)" >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "error: 'python3' is required to build the Firefox manifest" >&2
  exit 1
}

# Listing Only what the extension needs at runtime.
SOURCES=(
  manifest.json
  src
  assets
)

for path in "${SOURCES[@]}" "$OVERRIDES"; do
  [ -e "$path" ] || {
    echo "error: '$path' is required but does not exist" >&2
    exit 1
  }
done

VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')" || {
  echo "error: manifest.json is not valid JSON, or has no \"version\"" >&2
  exit 1
}

XPI="$PWD/$OUT_DIR/attendease-$VERSION.xpi"
STAGE="$OUT_DIR/.stage"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "${SOURCES[@]}" "$STAGE/"

# Rewrite the staged manifest for Firefox.
OVERRIDES="$OVERRIDES" STAGE="$STAGE" python3 <<'PY'
import json, os

manifest = json.load(open('manifest.json', encoding='utf-8'))
manifest['background'] = {'scripts': [manifest['background']['service_worker']]}
manifest.update(json.load(open(os.environ['OVERRIDES'], encoding='utf-8')))

path = os.path.join(os.environ['STAGE'], 'manifest.json')
with open(path, 'w', encoding='utf-8') as out:
    out.write(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
PY

rm -f "$XPI"
(cd "$STAGE" && zip -q -r -X "$XPI" "${SOURCES[@]}")
rm -rf "$STAGE"

echo "Built ${XPI#"$PWD"/} ($(du -h "$XPI" | cut -f1))"
echo
echo "To install temporarily (works on any Firefox, resets when you restart):"
echo "  about:debugging#/runtime/this-firefox -> Load Temporary Add-on -> select the .xpi"
echo
echo "Chrome and Edge load this checkout directly: chrome://extensions -> Developer mode"
echo "-> Load unpacked -> select this folder. No build is required."
