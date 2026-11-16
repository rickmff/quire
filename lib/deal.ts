// First load of the app: the cards on screen start as one quire of
// holographic sheets in the middle of the gallery, the same stack as the
// landing hero, and are dealt out one by one to their places. Transforms and
// opacity only, so the grid keeps its final layout and nothing shifts.

// Same easing family as the landing entrance and the star reorder.
const EASE = "cubic-bezier(.2,.8,.2,1)";
const GATHER = 200; // the pile fades in
const FIRST = 260; // first card leaves the pile
const STAGGER = 45;
const FLIGHT = 560;

// The hero's foil (components/quire3d/shader.ts): a pinwheel of the cosine
// palette foilAt(h) = 0.8 + 0.2 cos(2pi (h - [0, 1/3, 2/3])), with the hue
// turning around the middle of the sheet, washed out at the centre, a soft key
// light from above, a glass rim and one sweep of light. Levels are matched to
// the rendered hero: near-white sheets with a faint tint by day, smoky glass
// with a faint tint by night.
const TAU = Math.PI * 2;
const LEVEL = { light: { base: 0.972, tint: 0.2 }, dark: { base: 0.15, tint: 0.24 } };
function foilStops(dark: boolean, steps = 24): string {
  const { base, tint } = dark ? LEVEL.dark : LEVEL.light;
  const out: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const h = k / steps;
    const rgb = [0, 1 / 3, 2 / 3].map((o) => {
      const f = 0.8 + 0.2 * Math.cos(TAU * (h - o));
      return Math.round(Math.min(base + (f - 0.8) * tint, 1) * 255);
    });
    out.push(`rgb(${rgb.join(" ")}) ${(h * 100).toFixed(1)}%`);
  }
  return out.join(", ");
}
// Near the pinwheel's centre the shader fades the foil to a flat grey.
function centre(dark: boolean): string {
  const v = Math.round((dark ? LEVEL.dark.base + 0.02 : 0.985) * 255);
  return `rgb(${v} ${v} ${v})`;
}

function foilSheet(dark: boolean, i: number): { el: HTMLElement; wheel: HTMLElement; sweep: HTMLElement } {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "absolute",
    inset: "0",
    zIndex: "20",
    overflow: "hidden",
    borderRadius: "8px",
    pointerEvents: "none",
    // Glass rim: a touch darker by day, a lit edge by night.
    boxShadow: dark
      ? "inset 0 0 0 1px rgb(255 255 255 / .1), 0 10px 28px -14px rgb(0 0 0 / .6)"
      : "inset 0 0 0 1px rgb(150 140 220 / .18), 0 10px 28px -16px rgb(0 0 0 / .14)",
  });
  // The pinwheel turns, as the hue shifts with time and viewing angle.
  const wheel = document.createElement("div");
  Object.assign(wheel.style, {
    position: "absolute",
    left: "-60%",
    top: "-110%",
    width: "220%",
    height: "320%",
    // Each sheet starts a little further round the wheel, like fi * 0.061.
    background: `conic-gradient(from ${Math.round(i * 0.061 * 360)}deg, ${foilStops(dark)})`,
  });
  const wash = document.createElement("div");
  Object.assign(wash.style, {
    position: "absolute",
    inset: "0",
    background: [
      // Key light from above the middle of the sheet.
      `radial-gradient(ellipse 75% 85% at 50% 38%, rgb(255 255 255 / ${dark ? 0.06 : 0.35}), transparent 70%)`,
      // Foil washed out at the centre of the pinwheel.
      `radial-gradient(ellipse 45% 60% at 50% 50%, ${centre(dark)}, transparent)`,
    ].join(", "),
  });
  // The sweep of light the hero plays when a sheet is handed over.
  const sweep = document.createElement("div");
  Object.assign(sweep.style, {
    position: "absolute",
    inset: "-20% -60%",
    background: `linear-gradient(115deg, transparent 38%, rgb(255 255 255 / ${dark ? 0.12 : 0.5}) 50%, transparent 62%)`,
    transform: "translateX(-60%)",
  });
  el.append(wheel, wash, sweep);
  return { el, wheel, sweep };
}

// Deals every card visible in `root` and returns the time, in ms, when the
// last card is about to land (0 when there is nothing to deal).
export function deal(root: HTMLElement): number {
  const vh = window.innerHeight;
  const all = [...root.querySelectorAll<HTMLElement>("[data-card]")];
  for (const el of all) el.dataset.dealt = "";
  const cards = all.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.top < vh && r.bottom > 0;
  });
  if (!cards.length) return 0;

  const box = root.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = Math.max(box.top, 0) + (vh - Math.max(box.top, 0)) * 0.45;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const n = cards.length;

  cards.forEach((card, i) => {
    const face = card.firstElementChild as HTMLElement | null;
    const meta = card.lastElementChild as HTMLElement | null;
    if (!face) return;
    const r = face.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    // Lower cards sit a hair lower in the pile, each a little turned.
    const dy = cy - (r.top + r.height / 2) + i * 1.5;
    const rot = (((i * 37) % 7) - 3) * 0.9;
    const start = FIRST + i * STAGGER;
    const total = start + FLIGHT;
    const pile = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(.82)`;

    // The first card dealt is the top of the pile.
    face.style.zIndex = String(n - i + 1);
    const fly = face.animate(
      [
        { offset: 0, opacity: 0, transform: `${pile} translateY(10px)` },
        { offset: GATHER / total, opacity: 1, transform: pile, easing: "linear" },
        { offset: start / total, opacity: 1, transform: pile, easing: EASE },
        { offset: 1, opacity: 1, transform: "none" },
      ],
      { duration: total, easing: "linear", fill: "both" },
    );

    // The foil covers the card while it travels and clears as it lands.
    const { el: foil, wheel, sweep } = foilSheet(dark, i);
    face.appendChild(foil);
    // It starts to clear late in the flight, so the card face shows as it lands.
    const end = total + 160;
    const clear = (start + FLIGHT * 0.65) / end;
    const sheen = foil.animate([{ opacity: 1 }, { offset: clear, opacity: 1 }, { opacity: 0 }], {
      duration: end,
      easing: "linear",
      fill: "both",
    });
    wheel.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(70deg)" }], { duration: end, easing: "ease-in-out", fill: "both" });
    sweep.animate([{ transform: "translateX(-60%)" }, { transform: "translateX(60%)" }], {
      duration: FLIGHT * 0.8,
      delay: start,
      easing: EASE,
      fill: "both",
    });
    sheen.finished.then(() => foil.remove(), () => foil.remove());

    // Title and tags settle in once the card is down.
    const label = meta && meta !== face
      ? meta.animate(
          [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
          { duration: 320, delay: total - 120, easing: EASE, fill: "both" },
        )
      : null;

    Promise.all([fly.finished, label?.finished]).then(
      () => {
        face.style.zIndex = "";
        fly.cancel();
        label?.cancel();
      },
      () => (face.style.zIndex = ""),
    );
  });

  return FIRST + (n - 1) * STAGGER + FLIGHT * 0.6;
}
