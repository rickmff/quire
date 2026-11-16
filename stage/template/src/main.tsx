import "./index.css";
import { Component, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { demos, props } from "./demos";
import { ThemeProvider } from "next-themes";

const q = new URLSearchParams(location.search);
const theme = q.get("theme") === "dark" ? "dark" : "light";
const live = q.has("live");
document.documentElement.classList.add(theme, live ? "live" : "capture");
document.documentElement.style.colorScheme = theme;
if (q.get("w")) document.documentElement.style.setProperty("--stage-w", q.get("w") + "px");
if (q.get("fill")) document.documentElement.classList.add("fill");
if (q.get("box")) document.documentElement.classList.add("box");
if (q.get("h")) document.documentElement.style.setProperty("--stage-h", q.get("h") + "px");
if (q.get("zoom")) document.documentElement.style.setProperty("--stage-zoom", q.get("zoom"));
const w = window as any;
w.__errors = [];
addEventListener("error", (e) => w.__errors.push(String(e.message)));
const dead = document.head.appendChild(document.createElement("style"));
addEventListener("error", (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.getAttribute("src")) dead.textContent += `img[src=${JSON.stringify(img.getAttribute("src"))}]{visibility:hidden!important}\n`;
}, true);
addEventListener("unhandledrejection", (e) => w.__errors.push(String(e.reason)));

class Boundary extends Component<{ children: any }, { err?: string }> {
  state: { err?: string } = {};
  static getDerivedStateFromError(e: any) { return { err: String(e?.message || e) }; }
  componentDidCatch(e: any) { w.__errors.push(String(e?.message || e)); }
  render() { return this.state.err ? <pre id="stage-error" style={{ color: "red" }}>{this.state.err}</pre> : this.props.children; }
}
const tell = (event: string) => parent !== window && parent.postMessage({ source: "quire-stage", event }, location.origin);
function Ready() { useEffect(() => { requestAnimationFrame(() => { w.__ready = true; if (live) tell("ready"); }); }, []); return null; }

if (live) {
  addEventListener("click", (e) => { if ((e.target as Element).closest?.("a[href]")) e.preventDefault(); }, true);
  addEventListener("submit", (e) => e.preventDefault(), true);
  const overlay = ["[role=dialog]", "[role=alertdialog]", "[role=menu]", "[role=listbox]"].map((s) => `${s}:not([data-state=closed])`).join(",");
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.querySelector(overlay)) tell("escape"); }, true);
  if (q.has("card")) {
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function () {};
    const used = () => { HTMLElement.prototype.focus = focus; removeEventListener("pointerdown", used, true); removeEventListener("keydown", used, true); };
    addEventListener("pointerdown", used, true);
    addEventListener("keydown", used, true);
  }
}

if (q.get("cursor")) {
  const size = Number(q.get("cursor"));
  const c = document.createElement("div");
  c.id = "stage-cursor";
  c.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M5 2.5v17.2l4.3-4.1 2.9 6.6 3-1.3-2.9-6.5h6.1z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><i></i>`;
  document.body.appendChild(c);
  addEventListener("pointermove", (e) => { c.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; c.style.opacity = "1"; }, true);
  addEventListener("pointerdown", () => { c.classList.remove("press"); void c.offsetWidth; c.classList.add("press", "down"); }, true);
  addEventListener("pointerup", () => c.classList.remove("down"), true);
}

function Stage({ Demo }: { Demo: any }) {
  const [run, setRun] = useState(0);
  useEffect(() => { w.__remount = () => { w.__ready = false; setRun((n) => n + 1); }; }, []);
  let picked = {};
  try { picked = JSON.parse(q.get("p") || "{}"); } catch {}
  return (
    <Boundary key={run}><Suspense fallback={null}>{Demo ? <><Demo {...(props[c] ?? {})} {...picked} /><Ready /></> : <p>unknown component</p>}</Suspense></Boundary>
  );
}

const c = q.get("c") || "", v = q.get("v");
const load = (v && demos[`${c}~${v}`]) || demos[c];
const pick = (m: any) => m.default ?? Object.values(m).find((x) => typeof x === "function");
const render = (Demo: any) => createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" forcedTheme={q.get("freetheme") ? undefined : theme} defaultTheme={theme} storageKey={`stage-theme-${theme}`} enableSystem={false}>
    <div id="stage"><div id="subject"><Stage Demo={Demo} /></div></div>
  </ThemeProvider>
);
if (load) load().then((m) => render(pick(m)), (e) => { w.__errors.push(String(e?.message || e)); render(() => { throw e; }); });
else render(null);
