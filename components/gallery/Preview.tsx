"use client";

import { USER_ADDS } from "@/lib/features";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { type LiveDemo as Live } from "@/lib/catalog/schema";
import { type GalleryItem } from "@/lib/useCatalog";
import { useCaptureAvailable } from "@/lib/useCatalog";
import { typeById } from "@/lib/types";
import { watchOnScreen } from "@/components/gallery/hooks";
import { useReducedMotion } from "@/lib/media";
import { variantQuery } from "@/components/gallery/variants";
import type { Picked } from "@/components/gallery/types";

export function Preview({
  item,
  site,
  large,
  still,
}: {
  item: GalleryItem;
  site: string;
  large?: boolean;
  still?: boolean;
}) {
  const image = item.preview;
  const video = still ? undefined : item.video;
  return <PreviewMedia key={`${image}|${video}`} item={item} site={site} large={large} image={image} video={video} />;
}
function PreviewMedia({
  item,
  site,
  large,
  image,
  video,
}: {
  item: GalleryItem;
  site: string;
  large?: boolean;
  image?: string;
  video?: string;
}) {
  const [img, setImg] = useState(Boolean(image));
  const [vid, setVid] = useState(Boolean(video));
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(Boolean(large));
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || large) return;
    if (reduce) el.pause();
    return watchOnScreen(el, (visible) => {
      if (visible) setNear(true);
      if (reduce) return;
      if (visible) el.play().catch(() => {});
      else el.pause();
    });
  }, [vid, large, reduce]);

  if (vid && video)
    return (
      <video
        ref={ref}
        src={video}
        poster={img && near ? image : undefined}
        muted
        loop
        playsInline
        preload="none"
        autoPlay={large && !reduce}
        onMouseEnter={reduce ? () => ref.current?.play().catch(() => {}) : undefined}
        onMouseLeave={reduce && !large ? () => ref.current?.pause() : undefined}
        onError={() => setVid(false)}
        className="size-full object-cover"
      />
    );
  if (img && image)
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setImg(false)}
        className="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
      />
    );
  return <Pending item={item} site={site} large={large} />;
}
function Pending({ item, site, large }: { item: GalleryItem; site: string; large?: boolean }) {
  const capture = useCaptureAvailable();
  return (
    <div className="flex size-full flex-col justify-between p-4">
      <span className="text-[11px] text-faint">{typeById(item.type).name}</span>
      <span
        className={`font-medium tracking-tight text-muted ${large ? "text-[28px]" : "text-[19px]"} leading-[1.1] line-clamp-3`}
      >
        {item.title}
      </span>
      <span className={`text-[11px] text-faint ${capture ? "animate-pulse" : ""}`}>
        {!USER_ADDS
          ? "No preview"
          : capture === false
            ? "No preview. Start the capture service to record one."
            : `Recording preview · ${site}`}
      </span>
    </div>
  );
}
export function LiveDemo({
  live,
  title,
  onEscape,
  onReady,
  card,
  picked,
}: {
  live: Live;
  title: string;
  onEscape?: () => void;
  onReady?: () => void;
  card?: boolean;
  picked?: Picked;
}) {
  const src = `${live.src}${card ? "&card=1" : ""}${variantQuery(live.variants, picked)}`;
  return (
    <LiveFrame
      key={src}
      src={src}
      frame={live.frame}
      view={live.view}
      title={title}
      onEscape={onEscape}
      onReady={onReady}
    />
  );
}
function LiveFrame({
  src,
  frame,
  view,
  title,
  onEscape,
  onReady,
}: {
  src: string;
  frame: number[];
  view: number[];
  title: string;
  onEscape?: () => void;
  onReady?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);
  const [x, y, w] = frame;
  const announceReady = useEffectEvent(() => onReady?.());
  const announceEscape = useEffectEvent(() => onEscape?.());

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setScale(el.clientWidth / w);
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== win.current?.contentWindow || e.data?.source !== "quire-stage")
        return;
      if (e.data.event === "ready") {
        setReady(true);
        announceReady();
      }
      if (e.data.event === "escape") announceEscape();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  return (
    <div
      ref={box}
      className={`absolute inset-0 overflow-hidden transition-opacity duration-150 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {scale > 0 && (
        <iframe
          ref={win}
          src={src}
          title={`${title}, live demo`}
          allow="clipboard-write"
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{ width: view[0], height: view[1], transform: `scale(${scale}) translate(${-x}px, ${-y}px)` }}
        />
      )}
    </div>
  );
}
