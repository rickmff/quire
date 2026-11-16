// Stage build only: shiki with just the grammars and themes the demos use, so the
// built stage does not ship every language. Same engine (Oniguruma) as shiki's own
// codeToHtml, so the output matches.
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

let hl: Promise<HighlighterCore> | undefined;
const highlighter = () =>
  (hl ??= createHighlighterCore({
    themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
    langs: [import("@shikijs/langs/tsx"), import("@shikijs/langs/typescript"), import("@shikijs/langs/json"), import("@shikijs/langs/bash")],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  }));

export async function codeToHtml(code: string, options: Parameters<HighlighterCore["codeToHtml"]>[1]) {
  return (await highlighter()).codeToHtml(code, options);
}
