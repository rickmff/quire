import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{t}from"./index-TChZs6Gr.js";var n=t(),r=`
uniform float u_intensity;  // brightness before the colour mapping
uniform float u_frequency;  // how many folds
uniform float u_flow;       // how fast the folds stream outward
uniform float u_twist;      // how much the dark arms curl as they leave the oval
uniform float u_warp;       // slow, broad sway of the whole shape
uniform float u_hole;       // half-width of the dark oval
uniform float u_lobes;      // how strongly the light gathers into two opposite lobes
uniform float u_stretch;    // how many times longer the oval is than wide
uniform float u_softness;   // rounds the folds
uniform float u_angle;      // tilt, degrees
uniform float u_lean;       // how far the void leans toward the pointer
uniform float u_gloss;      // strength of the highlights
uniform float u_shine;      // size of the highlights: 0 broad, 1 pin-sharp
uniform float u_refraction; // colour shift along the slopes
uniform float u_chroma;     // colour split at the edges
uniform float u_vignette;   // darkening toward the corners

// coordinates: centred, nudged toward the pointer, tilted, and bent by a very slow, broad flow
// (low-frequency only, so every curve stays one clean line)
vec2 flowSpace(vec2 frag, float t) {
  vec2 p = (frag - 0.5 * u_res) / u_res.y;
  vec2 m = (u_pointer - 0.5 * u_res) / u_res.y;
  p -= m * 0.25 * u_lean * u_pointerAmt;
  float a = radians(u_angle);
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  p += u_warp * 0.03 * vec2(sin(p.y * 2.1 + t * 0.5), sin(p.x * 1.7 - t * 0.4));
  return p;
}

// the oval frame. After the tilt, the void is an oval whose long axis runs along y: half-width
// u_hole across, u_stretch times that along. Returns how far out from the oval's edge a point is
// and its angle around the oval. The angle turns a little with distance (twist), so the dark arms
// leaving the oval's ends curl.
vec2 oval(vec2 p) {
  vec2 q = vec2(p.x, p.y / u_stretch);
  float r = length(q);
  float th = atan(q.y, q.x) + u_twist * 0.9 * max(r - u_hole, 0.0);
  return vec2(r - u_hole, th);
}

// the liquid surface: 6 or 7 broad strips nested around the oval, each wider than the one inside
// it (the phase grows with the square root of the distance), streaming outward, with a thin soft
// crease between neighbours
float surface(vec2 p, float t) {
  vec2 o = oval(p);
  float d = max(o.x, 0.0) + 0.0005;
  float ph = sqrt(d) * u_frequency * 52.0 - t * u_flow * 2.0
    + 0.35 * snoise(vec3(p * 1.1, t * 0.12));
  // lopsided: each strip rises slowly from blue and falls quickly from its bright edge, so it reads
  // as a lit ribbon of glass rather than a symmetric stripe
  float a = 0.5 + 0.5 * sin(ph + 0.75 * sin(ph));
  float b = 0.5 + 0.5 * sin(ph * 2.0 + 1.1);
  float h = a * 0.85 + b * 0.15;
  // softness rounds the crests; less softness pinches them into ridges
  h = pow(h, mix(1.8, 0.9, u_softness));
  // a soft dark crease where one strip meets the next (rounded, so the lighting never flickers)
  float sc = cos(ph * 0.5);
  float crease = smoothstep(0.0, 0.35, sqrt(sc * sc + 0.01));
  return h * mix(1.0, crease, 0.6);
}

// the shape: the dark oval; darkness leaking from its two ends along the axis; light on the two
// sides, the left strongest toward its top and the right toward its bottom; a blue zone hugging the
// oval that warms outward
float body(vec2 p) {
  vec2 o = oval(p);
  float hole = smoothstep(0.0, 0.04, o.x);
  float ramp = mix(0.4, 1.0, smoothstep(0.0, 0.45, o.x));
  // across the axis is lit, along it dark; the bright side leans round toward one end
  float side = abs(cos(o.y + 0.7));
  float lobes = mix(1.0, smoothstep(0.12, 0.95, side), u_lobes);
  float outer = 1.0 - u_vignette * smoothstep(0.6, 1.3, length(p));
  return hole * ramp * lobes * outer;
}

vec3 colorama(float v) {
  return oklabToLinear(paletteRampLch(clamp(v, 0.0, 1.0)));
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.25;
  vec2 p = flowSpace(frag, t);
  float h = surface(p, t);
  float b = body(p);

  // surface normal from the slope of the height field (two neighbours, a pixel or two away)
  float e = 3.0 * u_dpr;
  float hx = surface(flowSpace(frag + vec2(e, 0.0), t), t);
  float hy = surface(flowSpace(frag + vec2(0.0, e), t), t);
  vec2 slope = vec2(hx - h, hy - h) / e * u_res.y * 0.03;
  vec3 n = normalize(vec3(-slope, 1.0));

  // colorama, shifted along the slope as if refracted, and split a little per channel
  float v = b * mix(0.3, 1.0, h) * u_intensity * smoothstep(0.0, 0.3, b);
  // contrast like the reference: most of it deep blue, only the crests reach pink and white
  v = v * v * (3.0 - 2.0 * min(v, 1.0)) * 0.6 + v * 0.4;
  float bend = dot(n.xy, vec2(0.6, 0.8)) * u_refraction * 0.35 * b;
  float split = u_chroma * 0.06 * b * length(n.xy);
  vec3 c = vec3(colorama(v + bend - split).r, colorama(v + bend).g, colorama(v + bend + split).b);

  // glass lighting: a sharp wet highlight on the crests and a rim on the steep sides
  vec3 l = normalize(vec3(-0.45, 0.55, 0.7));
  vec3 hv = normalize(l + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, hv), 0.0), mix(6.0, 260.0, u_shine * u_shine));
  float fres = pow(1.0 - n.z, 2.0);
  // tinted by the strip's own (brighter) colour, and only where it's lit, so fading strips never
  // turn grey
  vec3 tint = mix(colorama(min(v + 0.35, 1.0)), vec3(1.0), 0.25);
  c += tint * (spec * mix(0.7, 2.2, u_shine) + fres * 0.3) * u_gloss * b * smoothstep(0.2, 0.6, v);
  // a soft glow where the strips are brightest, so the light blends instead of edging hard
  c += colorama(min(v * 1.15, 1.0)) * smoothstep(0.6, 1.1, v) * 0.15 * u_gloss;
  return c;
}
`,i=[`#000000`,`#0d00aa`,`#301fe9`,`#b166fe`,`#ffecff`];function a({colors:t=i,speed:a=1,animate:o=!0,interactive:s=!0,grain:c=.03,seed:l=0,intensity:u=1.6,frequency:d=.55,flow:f=1,twist:p=.6,warp:m=1,hole:h=.15,lobes:g=1,stretch:_=2.4,softness:v=.5,gloss:y=.8,shine:b=.25,refraction:x=.45,chroma:S=.2,vignette:C=0,angle:w=-15,lean:T=.5,follow:E=.8,...D}){return(0,n.jsx)(e,{shader:r,uniforms:{u_intensity:u,u_frequency:d,u_flow:f,u_twist:p,u_warp:m,u_hole:h,u_lobes:g,u_stretch:_,u_softness:v,u_gloss:y,u_shine:b,u_refraction:x,u_chroma:S,u_vignette:C,u_angle:w,u_lean:T},colors:t,speed:a,animate:o,interactive:s,grain:c,seed:l,follow:E,fallback:()=>`radial-gradient(ellipse 20% 45% at 50% 50%, ${t[0]} 40%, transparent 70%), linear-gradient(${125+w}deg, ${t[0]}, ${t.slice(1).join(`, `)}, ${t[0]})`,...D})}function o(){return(0,n.jsx)(a,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{o as default};