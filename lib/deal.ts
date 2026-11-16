// First load of the app: the cards on screen start as one quire of
// holographic sheets in the middle of the gallery, the same stack as the
// landing hero, and are dealt out one by one to their places. Transforms and
// opacity only, so the grid keeps its final layout and nothing shifts.

// Same easing family as the landing entrance and the star reorder.
const EASE = "cubic-bezier(.2,.8,.2,1)";
const GATHER = 200; // the pile fades in
const FIRST = 260; // first card leaves the pile
const FIRST_HANDED = 40; // from the landing the pile is already in place
const STAGGER = 45;
const FLIGHT = 560;

// The hero's foil (components/quire3d/shader.ts): a pinwheel of the cosine
// palette foilAt(h) = 0.8 + 0.2 cos(2pi (h - [0, 1/3, 2/3])), with the hue
// turning around the middle of the sheet, washed out at the centre, a soft key
// light from above, a glass rim and one sweep of light. The levels are fitted
// to the hero's own pile, rendered straight from above (seven translucent
// sheets): near white with a soft tint by day, bright pastel by night.
const TAU = Math.PI * 2;
const shade = (f: number, dark: boolean) => (dark ? 0.079 + 0.906 * f : 0.895 + 0.58 * (f - 0.8));
function foilStops(dark: boolean, steps = 24): string {
  const out: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const h = k / steps;
    const rgb = [0, 1 / 3, 2 / 3].map((o) => Math.round(Math.min(shade(0.8 + 0.2 * Math.cos(TAU * (h - o)), dark), 1) * 255));
    out.push(`rgb(${rgb.join(" ")}) ${(h * 100).toFixed(1)}%`);
  }
  return out.join(", ");
}
// White light with a Gaussian falloff, as gradient stops.
const glow = (a: number) =>
  [0, 0.33, 0.67, 1].map((r) => `rgb(255 255 255 / ${(a * Math.exp(-((r * 1.56) ** 2) / 0.55)).toFixed(3)}) ${r * 100}%`).join(", ");
// Near the pinwheel's centre the shader fades the foil to 0.95 grey.
function centre(dark: boolean): string {
  const v = Math.round(shade(0.95, dark) * 255);
  return `rgb(${v} ${v} ${v})`;
}

// How one sheet's foil sits: the hue turn of its pinwheel (CSS degrees) and
// where the pinwheel's centre is, in % of the sheet. The hero sends the values
// its shader has when it hands the pile over.
export type FoilAt = { from: number; cx: number; cy: number };

export function foilSheet(dark: boolean, i: number, at?: FoilAt): { el: HTMLElement; wheel: HTMLElement; sweep: HTMLElement } {
  const { from = i * 0.061 * 360, cx = 50, cy = 50 } = at ?? {};
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
    boxShadow: dark ? "inset 0 0 0 1px rgb(255 255 255 / .1)" : "inset 0 0 0 1px rgb(150 140 220 / .18)",
  });
  // The pinwheel turns, as the hue shifts with time and viewing angle.
  const wheel = document.createElement("div");
  Object.assign(wheel.style, {
    position: "absolute",
    left: `${cx - 110}%`,
    top: `${cy - 160}%`,
    width: "220%",
    height: "320%",
    // Each sheet starts a little further round the wheel, like fi * 0.061.
    background: `conic-gradient(from ${from.toFixed(1)}deg, ${foilStops(dark)})`,
  });
  const wash = document.createElement("div");
  Object.assign(wash.style, {
    position: "absolute",
    inset: "0",
    background: [
      // Key light a quarter unit above the middle of the sheet, with the
      // shader's Gaussian falloff, exp(-r^2 / 0.55).
      `radial-gradient(ellipse 78% 104% at 50% 33%, ${glow(dark ? 0.1 : 0.3)})`,
      // Foil washed out at the centre of the pinwheel (smoothstep to 0.6 units).
      `radial-gradient(ellipse 30% 40% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, ${centre(dark)}, transparent)`,
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

// Hand-over from the landing: "Start collecting" has the hero settle its
// sheets into one flat pile (Quire3D), an HTML pile takes its place in the
// same frame, and /app deals that pile instead of making its own.
const HANDOFF = "quire:handoff";
const OVERLAY = "quire-handoff";
const PILE = 7; // the hero's seven sheets
// The hero's sheets are 2 by 1.5 world units (HALF in the shader).
const SHEET = 0.75;
export type Pile = { x: number; y: number; w: number; sheets?: FoilAt[] };
type Handoff = Pile & { at: number };
const pileRot = (i: number) => (((i * 37) % 7) - 3) * 0.9;

// Where the hero draws its stack (same formulas as Quire3D's resize).
function heroStack(stage: HTMLElement): Pile {
  const b = stage.getBoundingClientRect();
  const fh = Math.max(60, b.height);
  const fit = Math.min(fh / 2.92, (window.innerWidth - 24) / 2.5, 180);
  return { x: window.innerWidth / 2, y: b.top + fh / 2 - fh * 0.08, w: fit * 2 };
}

/** Draws the pile over the page where the hero left it, and leaves word for /app. */
export function handOffPile(at: Pile, settle = false) {
  const { x, y, w, sheets } = at;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.getElementById(OVERLAY)?.remove();
  const layer = document.createElement("div");
  layer.id = OVERLAY;
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none" });
  const pile = document.createElement("div");
  Object.assign(pile.style, {
    position: "absolute",
    left: `${x - w / 2}px`,
    top: `${y - (w * SHEET) / 2}px`,
    width: `${w}px`,
    aspectRatio: `1 / ${SHEET}`,
  });
  for (let i = PILE - 1; i >= 0; i--) {
    const sheet = foilSheet(dark, i, sheets?.[i]).el;
    sheet.style.transform = `translateY(${i * 1.5}px) rotate(${pileRot(i)}deg)`;
    pile.appendChild(sheet);
  }
  layer.appendChild(pile);
  document.body.appendChild(layer);
  // Without the WebGL hero the pile lies down by itself, from the hero's view.
  if (settle)
    pile.animate(
      [
        { opacity: 0, transform: "perspective(900px) rotateX(52deg) rotateZ(-28deg) scale(.92)" },
        { opacity: 1, offset: 0.45 },
        { opacity: 1, transform: "none" },
      ],
      { duration: 460, easing: EASE, fill: "both" },
    );
  try {
    sessionStorage.setItem(HANDOFF, JSON.stringify({ x, y, w, sheets, at: Date.now() } satisfies Handoff));
  } catch {}
  // Never leave it behind if /app has nothing to deal.
  setTimeout(() => dropOverlay(), 3000);
}

/** Without the WebGL hero: a pile lies down over the stage. Returns ms until it has settled. */
export function handOff(stage: HTMLElement): number {
  handOffPile(heroStack(stage), true);
  return 420;
}

function dropOverlay() {
  const el = document.getElementById(OVERLAY);
  if (!el) return;
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(() => el.remove(), () => el.remove());
}

function takeHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF);
    sessionStorage.removeItem(HANDOFF);
    const h = raw ? (JSON.parse(raw) as Handoff) : null;
    return h && Date.now() - h.at < 4000 ? h : null;
  } catch {
    return null;
  }
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
  const handoff = takeHandoff();
  if (!cards.length) {
    dropOverlay();
    return 0;
  }

  const box = root.getBoundingClientRect();
  const cx = handoff ? handoff.x : box.left + box.width / 2;
  const cy = handoff ? handoff.y : Math.max(box.top, 0) + (vh - Math.max(box.top, 0)) * 0.45;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const n = cards.length;

  // The dealt pile is drawn exactly where the landing's pile is, so the
  // landing's copy can go at once (a fade here would show two piles).
  if (handoff) document.getElementById(OVERLAY)?.remove();

  // Every clock of the deal, held until the new page has been painted.
  const clocks: Animation[] = [];
  cards.forEach((card, i) => {
    // The card's own entrance (a CSS fade on the article) would hide the pile.
    for (const a of card.getAnimations()) a.cancel();
    const face = card.firstElementChild as HTMLElement | null;
    const meta = card.lastElementChild as HTMLElement | null;
    if (!face) return;
    // The preview box is the sheet: size and centre come from it, not from
    // the whole face, which is a little taller.
    const sheet = (face.firstElementChild as HTMLElement | null) ?? face;
    const r = sheet.getBoundingClientRect();
    const fr = face.getBoundingClientRect();
    face.style.transformOrigin = `${r.left - fr.left + r.width / 2}px ${r.top - fr.top + r.height / 2}px`;
    const dx = cx - (r.left + r.width / 2);
    // Lower cards sit a hair lower in the pile, each a little turned. Cards
    // past the seventh wait right under it, out of sight.
    const slot = Math.min(i, PILE - 1);
    const dy = cy - (r.top + r.height / 2) + slot * 1.5;
    const rot = pileRot(slot);
    const start = (handoff ? FIRST_HANDED : FIRST) + i * STAGGER;
    const total = start + FLIGHT;
    // From the landing the pile keeps the hero's 4:3 sheets at the hero's size
    // and reshapes to the card in flight.
    const size = handoff ? `${handoff.w / r.width}, ${(handoff.w * SHEET) / r.height}` : ".82";
    const pile = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${size})`;

    // The first card dealt is the top of the pile.
    face.style.zIndex = String(n - i + 1);
    const fly = face.animate(
      handoff
        ? // Already on screen: no gather, the cards leave almost at once.
          [
            { offset: 0, opacity: 1, transform: pile },
            { offset: start / total, opacity: 1, transform: pile, easing: EASE },
            { offset: 1, opacity: 1, transform: "none" },
          ]
        : [
            { offset: 0, opacity: 0, transform: `${pile} translateY(10px)` },
            { offset: GATHER / total, opacity: 1, transform: pile, easing: "linear" },
            { offset: start / total, opacity: 1, transform: pile, easing: EASE },
            { offset: 1, opacity: 1, transform: "none" },
          ],
      { duration: total, easing: "linear", fill: "both" },
    );

    // The foil covers the card in the pile. In flight it thins, so the
    // component shows through the glass, and it clears as the card lands.
    const { el: foil, wheel, sweep } = foilSheet(dark, i, i < PILE ? handoff?.sheets?.[i] : undefined);
    sheet.appendChild(foil);
    const end = total + 160;
    const sheen = foil.animate(
      [
        { offset: 0, opacity: 1 },
        { offset: start / end, opacity: 1, easing: "ease-in" },
        { offset: (start + FLIGHT * 0.55) / end, opacity: 0.6 },
        { offset: total / end, opacity: 0.12 },
        { offset: 1, opacity: 0 },
      ],
      { duration: end, easing: "linear", fill: "both" },
    );
    const turn = wheel.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(70deg)" }], { duration: end, easing: "ease-in-out", fill: "both" });
    const glint = sweep.animate([{ transform: "translateX(-60%)" }, { transform: "translateX(60%)" }], {
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
    clocks.push(fly, sheen, turn, glint);
    if (label) clocks.push(label);

    Promise.all([fly.finished, label?.finished]).then(
      () => {
        face.style.zIndex = "";
        face.style.transformOrigin = "";
        fly.cancel();
        label?.cancel();
      },
      () => {
        face.style.zIndex = "";
        face.style.transformOrigin = "";
      },
    );
  });

  // The first frame of a new page is a long one (layout, images). Show the
  // pile through it, standing still, and start the clocks once it is painted,
  // so no card jumps at the start of its flight.
  for (const a of clocks) a.pause();
  requestAnimationFrame(() => requestAnimationFrame(() => clocks.forEach((a) => a.play())));

  return (handoff ? FIRST_HANDED : FIRST) + (n - 1) * STAGGER + FLIGHT * 0.6;
}
