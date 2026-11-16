#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$1" && pwd); shift
for lib in "$@"; do
  (cd "app-$lib" && npx vite build --base "/stage/$lib/" --outDir "$root/public/stage/$lib" --emptyOutDir --logLevel warn)
  echo "$lib: $(find "$root/public/stage/$lib" -type f | wc -l) files, $(du -sh "$root/public/stage/$lib" | cut -f1)"
done
