const EASE = "cubic-bezier(.2,.8,.2,1)";
const GATHER = 200;
const FIRST = 260;
const FIRST_HANDED = 40;
const STAGGER = 45;
const FLIGHT = 560;

const TAU = Math.PI * 2;
const shade = (f: number, dark: boolean) => (dark ? 0.079 + 0.906 * f : 0.895 + 0.58 * (f - 0.8));
function foilStops(dark: boolean, steps = 24): string {
  const out: string[] = [];
  for (let k = 0; k <= steps; k++) {
    const h = k / steps;
    const rgb = [0, 1 / 3, 2 / 3].map((o) =>
      Math.round(Math.min(shade(0.8 + 0.2 * Math.cos(TAU * (h - o)), dark), 1) * 255),
    );
    out.push(`rgb(${rgb.join(" ")}) ${(h * 100).toFixed(1)}%`);
  }
  return out.join(", ");
}
const glow = (a: number) =>
  [0, 0.33, 0.67, 1]
    .map((r) => `rgb(255 255 255 / ${(a * Math.exp(-((r * 1.56) ** 2) / 0.55)).toFixed(3)}) ${r * 100}%`)
    .join(", ");
function centre(dark: boolean): string {
  const v = Math.round(shade(0.95, dark) * 255);
  return `rgb(${v} ${v} ${v})`;
}

export type FoilAt = { from: number; cx: number; cy: number };

export function foilSheet(
  dark: boolean,
  i: number,
  at?: FoilAt,
): { el: HTMLElement; wheel: HTMLElement; sweep: HTMLElement } {
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
    boxShadow: dark ? "inset 0 0 0 1px rgb(255 255 255 / .1)" : "inset 0 0 0 1px rgb(150 140 220 / .18)",
  });
  const wheel = document.createElement("div");
  Object.assign(wheel.style, {
    position: "absolute",
    left: `${cx - 110}%`,
    top: `${cy - 160}%`,
    width: "220%",
    height: "320%",
    background: `conic-gradient(from ${from.toFixed(1)}deg, ${foilStops(dark)})`,
  });
  const wash = document.createElement("div");
  Object.assign(wash.style, {
    position: "absolute",
    inset: "0",
    background: [
      `radial-gradient(ellipse 78% 104% at 50% 33%, ${glow(dark ? 0.1 : 0.3)})`,
      `radial-gradient(ellipse 30% 40% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, ${centre(dark)}, transparent)`,
    ].join(", "),
  });
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

const HANDOFF = "quire:handoff";
const OVERLAY = "quire-handoff";
const PILE = 7;
const SHEET = 0.75;
export type Pile = { x: number; y: number; w: number; sheets?: FoilAt[] };
type Handoff = Pile & { at: number };
const pileRot = (i: number) => (((i * 37) % 7) - 3) * 0.9;

function heroStack(stage: HTMLElement): Pile {
  const b = stage.getBoundingClientRect();
  const fh = Math.max(60, b.height);
  const fit = Math.min(fh / 2.92, (window.innerWidth - 24) / 2.5, 180);
  return { x: window.innerWidth / 2, y: b.top + fh / 2 - fh * 0.08, w: fit * 2 };
}

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
  setTimeout(() => dropOverlay(), 3000);
}

export function handOff(stage: HTMLElement): number {
  handOffPile(heroStack(stage), true);
  return 420;
}

function dropOverlay() {
  const el = document.getElementById(OVERLAY);
  if (!el) return;
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(
    () => el.remove(),
    () => el.remove(),
  );
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

  if (handoff) document.getElementById(OVERLAY)?.remove();

  const clocks: Animation[] = [];
  cards.forEach((card, i) => {
    for (const a of card.getAnimations()) a.cancel();
    const face = card.firstElementChild as HTMLElement | null;
    const meta = card.lastElementChild as HTMLElement | null;
    if (!face) return;
    const sheet = (face.firstElementChild as HTMLElement | null) ?? face;
    const r = sheet.getBoundingClientRect();
    const fr = face.getBoundingClientRect();
    face.style.transformOrigin = `${r.left - fr.left + r.width / 2}px ${r.top - fr.top + r.height / 2}px`;
    const dx = cx - (r.left + r.width / 2);
    const slot = Math.min(i, PILE - 1);
    const dy = cy - (r.top + r.height / 2) + slot * 1.5;
    const rot = pileRot(slot);
    const start = (handoff ? FIRST_HANDED : FIRST) + i * STAGGER;
    const total = start + FLIGHT;
    const size = handoff ? `${handoff.w / r.width}, ${(handoff.w * SHEET) / r.height}` : ".82";
    const pile = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${size})`;

    face.style.zIndex = String(n - i + 1);
    const fly = face.animate(
      handoff
        ? [
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
    const turn = wheel.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(70deg)" }], {
      duration: end,
      easing: "ease-in-out",
      fill: "both",
    });
    const glint = sweep.animate([{ transform: "translateX(-60%)" }, { transform: "translateX(60%)" }], {
      duration: FLIGHT * 0.8,
      delay: start,
      easing: EASE,
      fill: "both",
    });
    sheen.finished.then(
      () => foil.remove(),
      () => foil.remove(),
    );

    const label =
      meta && meta !== face
        ? meta.animate(
            [
              { opacity: 0, transform: "translateY(4px)" },
              { opacity: 1, transform: "none" },
            ],
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

  for (const a of clocks) a.pause();
  requestAnimationFrame(() => requestAnimationFrame(() => clocks.forEach((a) => a.play())));

  return (handoff ? FIRST_HANDED : FIRST) + (n - 1) * STAGGER + FLIGHT * 0.6;
}
