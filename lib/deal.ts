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

// Pastel foil, after the cosine palette of the hero shader.
const FOIL =
  "linear-gradient(115deg, #ffe3ec 0%, #e4dcff 22%, #d7ecff 42%, #dcfff0 60%, #fff6d6 78%, #ffe3ec 100%)";

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

    // The foil sheen covers the card while it travels and clears as it lands.
    const foil = document.createElement("div");
    foil.setAttribute("aria-hidden", "true");
    Object.assign(foil.style, {
      position: "absolute",
      inset: "0",
      zIndex: "20",
      borderRadius: "8px",
      pointerEvents: "none",
      background: FOIL,
      backgroundSize: "260% 260%",
      boxShadow: "inset 0 0 0 1px rgb(255 255 255 / .7), 0 8px 24px -12px rgb(0 0 0 / .25)",
      opacity: dark ? ".9" : "1",
    });
    face.appendChild(foil);
    // It starts to clear late in the flight, so the card face shows as it lands.
    const end = total + 160;
    const sheen = foil.animate(
      [
        { backgroundPosition: "0% 50%", opacity: 1 },
        { offset: (start + FLIGHT * 0.65) / end, backgroundPosition: "80% 50%", opacity: 1 },
        { backgroundPosition: "100% 50%", opacity: 0 },
      ],
      { duration: end, easing: "linear", fill: "both" },
    );
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
