#!/usr/bin/env bash
# build.sh <repoRoot> <library> [<library> ...]
# Builds each stage app as a static site in <repoRoot>/public/stage/<library>/.
# The gallery runs the live demos from there, in an iframe on the site's own origin.
set -euo pipefail
root=$(cd "$1" && pwd); shift
for lib in "$@"; do
  (cd "app-$lib" && npx vite build --base "/stage/$lib/" --outDir "$root/public/stage/$lib" --emptyOutDir --logLevel warn)
  echo "$lib: $(find "$root/public/stage/$lib" -type f | wc -l) files, $(du -sh "$root/public/stage/$lib" | cut -f1)"
done
