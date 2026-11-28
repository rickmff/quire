import{a as e,n as t}from"./ShaderSurface-DjQw_LIl.js";import{t as n}from"./index-TChZs6Gr.js";var r=n(),i=`
uniform float u_spacing;   // distance between dots, css px
uniform float u_size;      // dot diameter, css px
uniform float u_radius;    // reach of the pointer light, css px
uniform float u_intensity; // strength of the drifting wave
uniform float u_twinkle;   // how often single dots sparkle
uniform float u_glow;      // halo around lit dots
uniform float u_ambient;   // colour wash under the grid
uniform float u_fade;      // fade toward the edges, 0..1
uniform float u_shape;     // 0 circle, 1 square, 2 diamond
uniform float u_stagger;   // 0 grid, 1 every other row shifted half a step
uniform vec3 u_dotColor;   // resting dot colour, OKLab
uniform float u_hasDotColor; // 0: resting dots follow the theme
uniform float u_magnify;   // loupe strength under the pointer light
uniform float u_trailAmt;  // how much the light stretches toward its tail

float shapeDist(vec2 d) {
  if (u_shape < 0.5) return length(d);
  if (u_shape < 1.5) return max(abs(d.x), abs(d.y)) * 1.1;
  return (abs(d.x) + abs(d.y)) * 0.8;
}

vec3 shade(vec2 frag) {
  // loupe: sample the grid closer to the light, so dots there look larger and further apart
  float R = u_radius * u_dpr;
  vec2 toP = frag - u_pointer;
  float lens = u_magnify * 0.38 * exp(-dot(toP, toP) / (R * R * 0.55)) * u_pointerAmt;
  vec2 screen = frag;
  frag = u_pointer + toP * (1.0 - lens);

  float sp = u_spacing * u_dpr;
  float row = floor(frag.y / sp);
  float shift = u_stagger * mod(row, 2.0) * 0.5 * sp;
  vec2 cell = vec2(floor((frag.x - shift) / sp), row);
  vec2 center = vec2((cell.x + 0.5) * sp + shift, (row + 0.5) * sp);
  vec2 q = center / u_res.y;
  vec2 uv = center / u_res;
  float t = u_time * 0.12;

  float wave = smoothstep(0.35, 0.95, snoise(vec3(q * 1.3, t)) * 0.5 + 0.5) * u_intensity;
  float h = hash12(cell + 3.7);
  float twinkle = pow(0.5 + 0.5 * sin(u_time * (0.5 + h * 0.8) + h * 40.0), 14.0) * u_twinkle;
  float pd = pointerDist(center, u_trailAmt) / R;
  float spot = exp(-pd * pd * 2.5) * u_pointerAmt;
  float light = clamp(wave + twinkle + spot + ripples(center), 0.0, 1.0);

  vec3 lit = paletteLoop(q.x * 0.2 + q.y * 0.1 + t * 0.4);
  vec3 rest = u_hasDotColor > 0.5 ? u_dotColor : vec3(mix(0.84, 0.34, u_dark), 0.0, 0.0);
  vec3 dotColor = mix(rest, lit, light);

  // a pale wash of the palette drifting under the grid
  vec2 fuv = screen / u_res.y;
  float wash = smoothstep(-0.3, 0.9, snoise(vec3(fuv * 0.8, t * 0.6)));
  vec3 base = mix(u_bg, paletteLoop(t * 0.2 + fuv.x * 0.3), wash * u_ambient * mix(0.1, 0.16, u_dark));

  // a faint halo around lit dots
  float d = length(frag - center);
  base = mix(base, lit, exp(-d * d / pow(sp * 0.45, 2.0)) * light * u_glow * mix(0.22, 0.4, u_dark));

  float edge = smoothstep(0.0, 0.2, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  float r = u_size * 0.5 * u_dpr * (1.0 + 0.45 * light);
  float mask = 1.0 - smoothstep(r - 0.75, r + 0.75, shapeDist(frag - center));
  mask *= mix(mix(1.0, edge, u_fade), 1.0, light);

  return oklabToLinear(mix(base, dotColor, mask));
}
`,a=[`#2fb4d2`,`#3a9ef2`,`#5a82ea`,`#34c1b0`],o={circle:0,square:1,diamond:2};function s({colors:n=a,speed:s=1,animate:c=!0,interactive:l=!0,grain:u=0,spacing:d=20,size:f=2.5,shape:p=`circle`,pattern:m=`grid`,dotColor:h=``,background:g=``,intensity:_=.7,twinkle:v=.5,glow:y=.6,ambient:b=.5,fade:x=1,radius:S=160,ripples:C=!0,follow:w=.6,trail:T=.6,magnify:E=.5,...D}){let O=h?e(h):[0,0,0];return(0,r.jsx)(t,{shader:i,uniforms:{u_spacing:d,u_size:f,u_radius:S,u_intensity:_,u_twinkle:v,u_glow:y,u_ambient:b,u_fade:x,u_shape:o[p]??0,u_stagger:+(m===`stagger`),u_hasDotColor:+!!h,u_magnify:E,u_trailAmt:T},vectors:{u_dotColor:O},colors:n,speed:s,animate:c,interactive:l,grain:u,background:g,ripples:C,follow:w,maxDpr:2,fallback:(e,t)=>{let r=h||(e?`#3a3a3a`:`#d4d4d4`);return`radial-gradient(circle at 50% 50%, ${n[0]}22, transparent 60%), radial-gradient(${r} ${f/2}px, transparent ${f/2+.5}px) 0 0 / ${d}px ${d}px, ${t}`},...D})}function c(){return(0,r.jsx)(s,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{c as default};