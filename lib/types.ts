// A fixed taxonomy of component types, shared by every site.
// Each site names its own categories ("Inputs", "AI kit"); quire maps every
// component to one of these types so references from different sites line up.

export type ComponentType = { id: string; name: string; family: string; re: RegExp };

// Order matters: the first match wins, so specific types come before broad ones.
export const TYPES: ComponentType[] = [
  // Navigation
  { id: "sidebar", name: "Sidebar", family: "Navigation", re: /\bside ?bar|side ?nav/i },
  { id: "toc", name: "Table of contents", family: "Navigation", re: /\btoc\b|table of contents/i },
  { id: "scroll-progress", name: "Scroll progress", family: "Navigation", re: /scroll ?progress|reading progress/i },
  { id: "dock", name: "Dock", family: "Navigation", re: /\bdock\b/i },
  { id: "navbar", name: "Navbar", family: "Navigation", re: /\bnav(bar|igation)?\b|\bheader\b|\bmenu ?bar\b/i },
  { id: "tabs", name: "Tabs", family: "Navigation", re: /\btabs?\b|segmented/i },
  { id: "breadcrumb", name: "Breadcrumb", family: "Navigation", re: /breadcrumb/i },
  { id: "pagination", name: "Pagination", family: "Navigation", re: /paginat/i },
  { id: "command", name: "Command menu", family: "Navigation", re: /command ?(menu|palette)|\bcmdk\b|spotlight/i },

  // Settings
  { id: "theme", name: "Theme switcher", family: "Input", re: /\btheme|dark ?mode|light ?mode|color scheme/i },

  // Input
  { id: "otp", name: "OTP input", family: "Input", re: /\botp\b|one.?time|verification code|pin input/i },
  { id: "password", name: "Password input", family: "Input", re: /password/i },
  { id: "picker", name: "Date & time picker", family: "Input", re: /picker|calendar|\bdate\b|duration|\btime\b/i },
  { id: "file-upload", name: "File upload", family: "Input", re: /upload|dropzone|file input/i },
  { id: "select", name: "Select", family: "Input", re: /\bselect\b|combo ?box|dropdown(?! menu)|autocomplete/i },
  { id: "toggle", name: "Switch & checkbox", family: "Input", re: /\bswitch\b|toggle|checkbox|radio/i },
  { id: "slider", name: "Slider", family: "Input", re: /\brange\b|\bslider\b(?!.*(image|carousel))/i },
  { id: "form", name: "Form", family: "Input", re: /\bform\b|login|log in|sign ?(in|up)|contact form|newsletter/i },
  { id: "button", name: "Button", family: "Input", re: /button|\bbtn\b/i },
  { id: "input", name: "Text input", family: "Input", re: /\binput|text ?field|textarea|search bar/i },

  // Feedback
  { id: "toast", name: "Toast", family: "Feedback", re: /toast|snackbar|sonner/i },
  { id: "notification", name: "Notification", family: "Feedback", re: /notification|\bbell\b|\bbadge\b|\balert\b/i },
  { id: "reaction", name: "Reaction", family: "Feedback", re: /reaction|emoji|\blike\b|tapback/i },
  { id: "loader", name: "Loader", family: "Feedback", re: /loader|loading|spinner|skeleton|shimmer/i },
  { id: "progress", name: "Progress & steps", family: "Feedback", re: /progress|stepper|\bsteps?\b/i },
  { id: "tooltip", name: "Tooltip", family: "Feedback", re: /tooltip|hover ?card/i },

  // Overlay
  { id: "drawer", name: "Drawer", family: "Overlay", re: /drawer|\bsheet\b|bottom ?sheet/i },
  { id: "modal", name: "Modal", family: "Overlay", re: /modal|dialog|lightbox/i },
  { id: "popover", name: "Popover & menu", family: "Overlay", re: /popover|context ?menu|dropdown ?menu/i },

  // AI
  { id: "ai", name: "AI interface", family: "AI", re: /\bai\b|\bchat|prompt|assistant|\bagent|\bllm\b|web ?search|thinking/i },

  // Sections
  { id: "hero", name: "Hero", family: "Section", re: /\bhero/i },
  { id: "pricing", name: "Pricing", family: "Section", re: /pricing/i },
  { id: "testimonial", name: "Testimonial", family: "Section", re: /testimonial|review/i },
  { id: "footer", name: "Footer", family: "Section", re: /footer/i },
  { id: "features", name: "Features", family: "Section", re: /\bfeatures?\b|bento/i },
  { id: "cta", name: "Call to action", family: "Section", re: /\bcta\b|call to action/i },
  { id: "faq", name: "FAQ & accordion", family: "Section", re: /\bfaq|accordion|collapsible/i },

  // Data display
  { id: "code", name: "Code block", family: "Data", re: /code ?block|\bcode\b|terminal|snippet|syntax/i },
  { id: "chart", name: "Chart", family: "Data", re: /chart|graph|heat ?map|activity|sparkline|contribution/i },
  { id: "table", name: "Table", family: "Data", re: /\btable\b|data ?grid/i },
  { id: "counter", name: "Counter", family: "Data", re: /counter|number|ticker|odometer|countdown/i },
  { id: "list", name: "List & tasks", family: "Data", re: /\blist\b|\btasks?\b|todo|checklist|kanban/i },
  { id: "timeline", name: "Timeline", family: "Data", re: /timeline|changelog/i },
  { id: "avatar", name: "Avatar", family: "Data", re: /avatar|profile/i },
  { id: "card", name: "Card", family: "Data", re: /\bcards?\b/i },

  // Media
  { id: "player", name: "Media player", family: "Media", re: /player|audio|voice|video|music|waveform/i },
  { id: "carousel", name: "Carousel & marquee", family: "Media", re: /carousel|marquee|gallery|slideshow|image slider/i },
  { id: "device", name: "Device mockup", family: "Media", re: /mockup|iphone|android|safari|browser frame/i },

  // Visual effects
  { id: "text-effect", name: "Text effect", family: "Effect", re: /\btext|letters?|typewriter|typing|heading|\bwords?\b|font|glyph/i },
  { id: "orb", name: "Orb & shader", family: "Effect", re: /\borb\b|blob|sphere|shader|webgl|fluid/i },
  { id: "background", name: "Background", family: "Effect", re: /background|gradient|\bgrid\b|beams?|particles|aurora|noise|dots|stars|meteor/i },
  { id: "3d", name: "3D", family: "Effect", re: /\b3d\b|three|globe/i },
  { id: "cursor", name: "Cursor", family: "Effect", re: /cursor|pointer|magnetic/i },
  { id: "motion", name: "Motion", family: "Effect", re: /animat|motion|hover|scroll|parallax|spring|reveal|transition/i },
];

export const OTHER: ComponentType = { id: "other", name: "Other", family: "Other", re: /$^/ };

const BY_ID = new Map([...TYPES, OTHER].map((t) => [t.id, t]));

export const typeById = (id: string | undefined) => BY_ID.get(id ?? "") ?? OTHER;

// Strongest signal first: the component name, then the site's category,
// then the description. Within each signal the first matching type wins.
export function classify(input: { title?: string; name?: string; category?: string; description?: string }): string {
  const tiers = [
    [input.title, input.name].filter(Boolean).join(" "),
    input.category ?? "",
    input.description ?? "",
  ].map((s) => s.replace(/[-_/]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
  for (const text of tiers) {
    if (!text.trim()) continue;
    const t = TYPES.find((x) => x.re.test(text));
    if (t) return t.id;
  }
  return OTHER.id;
}
