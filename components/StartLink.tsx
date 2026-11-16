"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { handOff, handOffPile, type Pile } from "@/lib/deal";
import { preloadCatalog } from "@/lib/useCatalog";
import s from "@/components/Landing.module.css";

// "Start collecting": the words step back, the hero's own sheets settle into
// one flat pile facing us (Quire3D), an HTML pile takes its place in that same
// frame, and /app deals it into the gallery. Without the WebGL hero a pile
// lies down over the stage instead. Reduced motion or a modified click: a
// plain link.
export default function StartLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const going = useRef(false);
  useEffect(() => router.prefetch("/app"), [router]);
  return (
    <Link
      href="/app"
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const stage = document.querySelector<HTMLElement>(`.${s.stage}`);
        const page = document.querySelector<HTMLElement>(`.${s.page}`);
        if (!stage || !page) return;
        e.preventDefault();
        if (going.current) return;
        going.current = true;
        preloadCatalog();
        const go = () => router.push("/app");

        let done = false;
        const left = (ev: Event) => {
          if (done) return;
          done = true;
          handOffPile((ev as CustomEvent<Pile>).detail);
          go();
        };
        addEventListener("quire:left", left, { once: true });
        let accepted = false;
        dispatchEvent(new CustomEvent("quire:leave", { detail: { accept: () => (accepted = true) } }));

        if (accepted) {
          page.classList.add(s.leaving);
          // If the hero stalls (say the tab went to the background), go anyway.
          setTimeout(() => {
            if (done) return;
            done = true;
            removeEventListener("quire:left", left);
            setTimeout(go, handOff(stage));
          }, 1500);
        } else {
          removeEventListener("quire:left", left);
          page.classList.add(s.leaving, s.flat);
          setTimeout(go, handOff(stage));
        }
      }}
    >
      {children}
    </Link>
  );
}
