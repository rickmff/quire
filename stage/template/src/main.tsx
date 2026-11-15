import "./index.css";
import { Component, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { demos, props } from "./demos";
import { ThemeProvider } from "next-themes";

const q = new URLSearchParams(location.search);
const theme = q.get("theme") === "dark" ? "dark" : "light";
document.documentElement.classList.add(theme, "capture");
document.documentElement.style.colorScheme = theme;
if (q.get("w")) document.documentElement.style.setProperty("--stage-w", q.get("w") + "px");
if (q.get("fill")) document.documentElement.classList.add("fill");
if (q.get("box")) document.documentElement.classList.add("box");
if (q.get("h")) document.documentElement.style.setProperty("--stage-h", q.get("h") + "px");
if (q.get("zoom")) document.documentElement.style.setProperty("--stage-zoom", q.get("zoom"));
const w = window as any;
w.__errors = [];
addEventListener("error", (e) => w.__errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => w.__errors.push(String(e.reason)));

class Boundary extends Component<{ children: any }, { err?: string }> {
  state: { err?: string } = {};
  static getDerivedStateFromError(e: any) { return { err: String(e?.message || e) }; }
  componentDidCatch(e: any) { w.__errors.push(String(e?.message || e)); }
  render() { return this.state.err ? <pre id="stage-error" style={{ color: "red" }}>{this.state.err}</pre> : this.props.children; }
}
function Ready() { useEffect(() => { requestAnimationFrame(() => (w.__ready = true)); }, []); return null; }

const Demo = demos[q.get("c") || ""];
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" forcedTheme={theme} defaultTheme={theme} storageKey={`stage-theme-${theme}`} enableSystem={false}>
    <div id="stage"><div id="subject">
      <Boundary><Suspense fallback={null}>{Demo ? <><Demo {...(props[q.get("c") || ""] ?? {})} /><Ready /></> : <p>unknown component</p>}</Suspense></Boundary>
    </div></div>
  </ThemeProvider>
);
