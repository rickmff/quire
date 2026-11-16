export type Trigger = { id: string; name: string; re: RegExp };

export const TRIGGERS: Trigger[] = [
  {
    id: "hover",
    name: "Hover",
    re: /hover|spotlight|glare|tilt|magnetic|follow|proximity|direction.?aware|lens|focus/i,
  },
  {
    id: "click",
    name: "Click & tap",
    re: /click|tap|press|toggle|confetti|ripple|stateful|delete|copy|flip|expand|morph|reaction|like/i,
  },
  { id: "scroll", name: "Scroll", re: /scroll|parallax|sticky|reveal on|in.?view|viewport|progress|tracing/i },
  { id: "cursor", name: "Cursor", re: /cursor|pointer|trail|blob|crosshair|splash/i },
  { id: "drag", name: "Drag & gesture", re: /drag|swipe|throw|gesture|draggable|grab|sortable|stack/i },
  {
    id: "typing",
    name: "Typing & text",
    re: /typ(e|ing|ewriter)|scramble|decrypt|encrypt|shuffle|morphing text|text (generate|reveal)|word|letter|split|blur.?text|rotating text/i,
  },
  {
    id: "entrance",
    name: "Entrance",
    re: /entrance|appear|fade|reveal|animated (content|group|list)|stagger|blur.?in|slide.?in|intro/i,
  },
  {
    id: "loop",
    name: "Ambient loop",
    re: /marquee|infinite|aurora|beam|meteor|particles|stars|sparkle|wave|orb|globe|shader|noise|gradient|ripple|pulse|shine|shimmer|border|loader|spinner|background|grid|vortex|lamp|dither/i,
  },
  {
    id: "state",
    name: "State change",
    re: /tabs|accordion|dialog|modal|drawer|toast|dropdown|popover|tooltip|menu|dock|navbar|switch|counter|number|stepper|otp|input|select|progress/i,
  },
];

const TECH: [string, RegExp][] = [
  ["Motion", /^(motion|framer-motion)(@|$)/],
  ["GSAP", /^gsap(@|$)/],
  ["Three.js", /^(three|@react-three\/)/],
  ["WebGL", /^(ogl|cobe|regl|postprocessing|@paper-design\/shaders)/],
  ["Lottie", /lottie/],
  ["React Spring", /^@?react-spring/],
  ["Matter.js", /^matter-js/],
];

export function techFrom(deps: string[] = []): string[] {
  const out = new Set<string>();
  for (const d of deps) for (const [name, re] of TECH) if (re.test(d)) out.add(name);
  return [...out];
}

export function triggersFor(input: {
  title?: string;
  name?: string;
  description?: string;
  category?: string;
}): string[] {
  const text = [input.title, input.name, input.category, input.description]
    .filter(Boolean)
    .join(" ")
    .replace(/[-_/]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  const hits = TRIGGERS.filter((t) => t.re.test(text)).map((t) => t.id);
  return hits.slice(0, 3);
}

export const triggerById = (id: string) => TRIGGERS.find((t) => t.id === id);
