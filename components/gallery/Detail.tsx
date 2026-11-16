"use client";

import { useEffect, useState } from "react";
import { type GalleryItem } from "@/lib/useCatalog";
import { typeById } from "@/lib/types";
import { triggerById } from "@/lib/motion";
import StarIcon from "@/components/StarIcon";
import { Tip } from "@/components/ui/tooltip";
import { agentText } from "@/lib/agentText";
import type { Picked } from "@/components/gallery/types";
import { LiveDemo, Preview } from "@/components/gallery/Preview";
import { VariantsMenu } from "@/components/gallery/VariantsMenu";

type SourceFile = { path: string; content: string; truncated?: boolean };
export function Detail({
  item,
  site,
  saved,
  onClose,
  onStar,
  copy,
}: {
  item: GalleryItem;
  site: string;
  saved: boolean;
  onClose: () => void;
  onStar: () => void;
  copy: (text: string, msg: string) => void;
}) {
  const [src, setSrc] = useState<
    { state: "idle" | "loading" | "none" } | { state: "done"; files: SourceFile[]; from?: string }
  >({ state: "idle" });
  const [tab, setTab] = useState(0);
  const [run, setRun] = useState(0);
  const [picked, setPicked] = useState<Picked>({});
  const mine = item.id.startsWith("mine/");
  const [pop, setPop] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => setSrc({ state: "idle" }), [item.id]);

  const loadSource = async () => {
    setSrc({ state: "loading" });
    try {
      const r = await fetch(`/api/source?id=${encodeURIComponent(item.id)}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setSrc({ state: "done", files: d.files ?? [], from: d.from });
      setTab(0);
    } catch {
      setSrc({ state: "none" });
    }
  };

  const forAgent = agentText(item, site);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={item.title}>
      <button className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} aria-label="Close" />
      <aside className="slide relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-line bg-bg">
        <div className="flex h-12 shrink-0 items-center justify-between px-5">
          <span className="text-[12px] text-faint">{typeById(item.type).name}</span>
          <button onClick={onClose} className="text-[12px] text-faint transition hover:text-muted">
            Close
          </button>
        </div>
        <div className="px-5 pb-10">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-hover">
            <Preview item={item} site={site} large still={Boolean(item.live)} />
            {item.live && (
              <LiveDemo
                key={`${item.id}|${run}`}
                live={item.live}
                title={item.title}
                onEscape={onClose}
                picked={picked}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-line ring-inset" />
            {item.live?.variants && (
              <VariantsMenu groups={item.live.variants} picked={picked} onPick={setPicked} always />
            )}
          </div>
          {item.live && (
            <div className="mt-1.5 flex items-center justify-between text-[12px] text-faint">
              <span>Live. Hover, click and type in it.</span>
              <button onClick={() => setRun((n) => n + 1)} className="transition hover:text-muted">
                Restart
              </button>
            </div>
          )}

          <div className="mt-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[17px] font-medium tracking-tight first-letter:uppercase">{item.title}</h2>
            <a
              href={item.docs}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[12px] text-muted transition hover:text-fg"
            >
              {site} ↗
            </a>
          </div>
          {item.description && <p className="mt-1.5 text-muted">{item.description}</p>}
          {item.note && <p className="mt-1.5 text-muted">Note: {item.note}</p>}

          <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-1.5 text-[12px]">
            <dt className="text-faint">Type</dt>
            <dd>{typeById(item.type).name}</dd>
            {item.triggers.length > 0 && (
              <>
                <dt className="text-faint">Motion</dt>
                <dd>{item.triggers.map((t) => triggerById(t)?.name ?? t).join(", ")}</dd>
              </>
            )}
            {item.tech.length > 0 && (
              <>
                <dt className="text-faint">Built with</dt>
                <dd>{item.tech.join(", ")}</dd>
              </>
            )}
            {item.category && (
              <>
                <dt className="text-faint">On {site}</dt>
                <dd className="first-letter:uppercase">{item.category.replace(/-/g, " ")}</dd>
              </>
            )}
            {!mine && (
              <>
                <dt className="text-faint">Agent id</dt>
                <dd className="font-mono text-[11px] text-muted">{item.id}</dd>
              </>
            )}
          </dl>

          {item.install && (
            <Tip label="Copy install command">
              <button
                onClick={() => copy(item.install!, "Command copied")}
                className="mt-5 flex w-full items-center justify-between gap-3 rounded-md bg-field px-3 py-2 text-left font-mono text-[11px] text-muted transition hover:bg-field-focus"
              >
                <span className="truncate">{item.install}</span>
                <span className="shrink-0 font-sans text-faint">Copy</span>
              </button>
            </Tip>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tip label={saved ? "Remove from Starred" : "Add to Starred"}>
              <button
                type="button"
                data-star
                onClick={() => {
                  setPop(!saved);
                  onStar();
                }}
                aria-pressed={saved}
                className={`group btn ${saved ? "btn-secondary" : "btn-primary"}`}
              >
                <span className={`flex ${pop ? "star-pop" : ""}`} onAnimationEnd={() => setPop(false)}>
                  <StarIcon filled={saved} />
                </span>
                {saved ? "Starred" : "Star"}
              </button>
            </Tip>
            <button onClick={() => copy(forAgent, "Copied for your agent")} className="btn btn-secondary">
              Copy for agent
            </button>
            <a href={item.docs} target="_blank" rel="noreferrer" className="btn btn-secondary">
              Open docs
            </a>
          </div>

          {item.source && (
            <div className="mt-8">
              {src.state === "idle" && (
                <button onClick={loadSource} className="text-[12px] text-muted transition hover:text-fg">
                  Show source code
                </button>
              )}
              {src.state === "loading" && <p className="text-[12px] text-faint">Reading source…</p>}
              {src.state === "none" && (
                <p className="text-[12px] text-faint">The source is not readable right now. Open the docs.</p>
              )}
              {src.state === "done" && src.files.length > 0 && (
                <div>
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {src.files.map((f, n) => (
                      <button
                        key={f.path}
                        onClick={() => setTab(n)}
                        className={`h-7 shrink-0 rounded-md px-2 font-mono text-[11px] transition ${tab === n ? "bg-hover text-fg" : "text-faint hover:text-muted"}`}
                      >
                        {f.path.split("/").pop()}
                      </button>
                    ))}
                    <button
                      onClick={() => copy(src.files[tab].content, "Code copied")}
                      className="ml-auto h-7 shrink-0 px-2 text-[12px] text-faint transition hover:text-muted"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="mt-1.5 max-h-[420px] overflow-auto rounded-md bg-field p-3 font-mono text-[11px] leading-relaxed text-muted">
                    {src.files[tab].content}
                    {src.files[tab].truncated && "\n…"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
