#!/bin/sh
# setup.sh <library> : build app-<library> from template/ and the library's registry
set -e
lib=$1; app=app-$lib
mkdir -p $app/src
cp -r template/. $app/
node install.mjs $lib $app
[ -f $app/src/lib/utils.ts ] || { mkdir -p $app/src/lib; cp template/src/lib-utils.ts $app/src/lib/utils.ts; }
cd $app
deps=$(node -e 'console.log(require("./deps.json").map(d=>d.replace(/^(@?[^@]+)@.*$/,"$1")+"@latest").join(" "))')
npm i --legacy-peer-deps --no-audit --no-fund react@19 react-dom@19 next-themes clsx tailwind-merge class-variance-authority lucide-react motion radix-ui tw-animate-css @fontsource-variable/geist @fontsource-variable/geist-mono $deps 2>&1 | tail -1
# lucide-react 1.x dropped the brand icons (Github, Facebook) the Animate UI demos use.
[ "$lib" = animate-ui ] && npm i --legacy-peer-deps --no-audit --no-fund lucide-react@0.577.0 2>&1 | tail -1
npm i --legacy-peer-deps --no-audit --no-fund -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite typescript @types/react 2>&1 | tail -1
