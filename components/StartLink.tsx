"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { handOff } from "@/lib/deal";
import { preloadCatalog } from "@/lib/useCatalog";
import s from "@/components/Landing.module.css";

// "Start collecting": the landing steps back, the hero's stack lies down as a
// pile of foil sheets, and /app deals that same pile into the gallery.
// Reduced motion, a modified click or no hero: a plain link.
export default function StartLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
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
        preloadCatalog();
        page.classList.add(s.leaving);
        setTimeout(() => router.push("/app"), handOff(stage));
      }}
    >
      {children}
    </Link>
  );
}
