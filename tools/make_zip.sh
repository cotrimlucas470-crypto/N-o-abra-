#!/usr/bin/env bash
# Empacota o Forge Mobile em dist/forge-mobile.zip (app pronto para servir por HTTP).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/forge-mobile.zip
if command -v zip >/dev/null 2>&1; then
  zip -r -q dist/forge-mobile.zip \
    index.html manifest.json sw.js README.md css js assets tools \
    -x '*.DS_Store'
else
  python3 - <<'PY'
import os, zipfile
INCLUDE = ('index.html', 'manifest.json', 'sw.js', 'README.md', 'css', 'js', 'assets', 'tools')
with zipfile.ZipFile('dist/forge-mobile.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for item in INCLUDE:
        if os.path.isfile(item):
            z.write(item)
            continue
        for root, _dirs, files in os.walk(item):
            for f in files:
                z.write(os.path.join(root, f))
PY
fi
echo "dist/forge-mobile.zip  ($(du -h dist/forge-mobile.zip | cut -f1))"
