import "./index.css";
import { Component, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { demos, props } from "./demos";
import { ThemeProvider } from "next-themes";

const q = new URLSearchParams(location.search);
const theme = q.get("theme") === "dark" ? "dark" : "light";
// live=1: the page runs inside Quire's gallery (an iframe), not for a screenshot.
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
// An image whose URL is dead at its origin shows nothing, not a broken icon with alt text.
// A rule per dead URL, so it also holds when a component re-mounts or restyles the image.
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
  // Demo links and forms do not navigate the frame away from the demo.
  addEventListener("click", (e) => { if ((e.target as Element).closest?.("a[href]")) e.preventDefault(); }, true);
  addEventListener("submit", (e) => e.preventDefault(), true);
  // Escape closes the gallery's panel, unless the demo has its own overlay open to close first.
  // Window capture runs before the demo's own handlers, so the overlay is still in the DOM here.
  const overlay = ["[role=dialog]", "[role=alertdialog]", "[role=menu]", "[role=listbox]"].map((s) => `${s}:not([data-state=closed])`).join(",");
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.querySelector(overlay)) tell("escape"); }, true);
  // grid=1: a card in the grid. A click on the demo's controls works; a click anywhere else opens the card.
  if (q.has("grid")) {
    const control = "a,button,input,select,textarea,label,summary,[role=button],[role=switch],[role=checkbox],[role=tab],[role=menuitem],[role=slider],[contenteditable],[tabindex]:not([tabindex='-1'])";
    addEventListener("click", (e) => {
      const t = e.target as Element;
      if (t.closest?.(control) || getComputedStyle(t).cursor === "pointer") return;
      e.preventDefault(); e.stopPropagation(); tell("open");
    }, true);
  }
}

const Demo = demos[q.get("c") || ""];
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" forcedTheme={theme} defaultTheme={theme} storageKey={`stage-theme-${theme}`} enableSystem={false}>
    <div id="stage"><div id="subject">
      <Boundary><Suspense fallback={null}>{Demo ? <><Demo {...(props[q.get("c") || ""] ?? {})} /><Ready /></> : <p>unknown component</p>}</Suspense></Boundary>
    </div></div>
  </ThemeProvider>
);
