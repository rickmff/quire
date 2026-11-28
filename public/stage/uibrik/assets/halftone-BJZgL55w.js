import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{t}from"./index-TChZs6Gr.js";var n=t(),r=`
uniform float u_cell;      // dot spacing, css px
uniform float u_dotSize;   // largest dot, as a share of the spacing
uniform float u_minDot;    // smallest dot, as a share of the largest
uniform float u_angle;     // grid angle, degrees
uniform float u_frequency; // size of the ribbons; higher is busier
uniform float u_flow;      // how much the ribbons curl
uniform float u_bandWidth; // thickness of the ribbons
uniform float u_contrast;  // tone contrast
uniform float u_glow;      // light spilling around bright dots
uniform float u_softness;  // blur on each dot's edge
uniform float u_fade;      // how much the dots fade out (see u_fadeFrom)
uniform float u_fadeFrom;  // 0 edges, 1 top, 2 bottom, 3 left, 4 right
uniform float u_radius;    // width of the pointer trail, css px
uniform float u_trailAmt;  // how strongly the trail lights the dots

float fbm(vec3 p) {
  return snoise(p) * 0.78 + snoise(p * 2.03 + 7.1) * 0.22;
}

// 0 dark .. 1 the middle of a ribbon of light
float toneAt(vec2 q, float t) {
  vec2 p = q * 0.55 * u_frequency;
  vec2 w = vec2(fbm(vec3(p * 0.5, t)), fbm(vec3(p * 0.5 + 5.2, t)));
  float n = fbm(vec3(p + w * u_flow * 0.7, t * 0.7));
  float bw = 0.2 * u_bandWidth;
  float v = exp(-n * n / (bw * bw));
  // broad swells so some ribbons burn brighter than others
  v *= 0.65 + 0.35 * (snoise(vec3(p * 0.35, t * 0.5)) * 0.5 + 0.5);
  return clamp((v - 0.5) * u_contrast + 0.5, 0.0, 1.0);
}

// 1 where dots stay, falling to 0 where they fade out
float fadeAt(vec2 uv) {
  float k;
  if (u_fadeFrom < 0.5) k = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) * 2.0;
  else if (u_fadeFrom < 1.5) k = 1.0 - uv.y;
  else if (u_fadeFrom < 2.5) k = uv.y;
  else if (u_fadeFrom < 3.5) k = uv.x;
  else k = 1.0 - uv.x;
  return mix(1.0, smoothstep(0.0, 0.7, k), u_fade);
}

// The pointer's path as a liquid rather than a stroke: its edges are warped by slowly flowing noise,
// the tail spreads wider as it thins (like ink diffusing), and a soft threshold gives it a body, so
// it reads as a blob of ink with a feathered rim instead of a blurred line.
float liquidTrail(vec2 p, float R, float t) {
  vec2 q = p / (R * 2.4);
  p += vec2(snoise(vec3(q, t)), snoise(vec3(q + 7.3, t))) * R * 0.5;
  float best = 0.0;
  for (int i = 0; i < 15; i++) {
    if (i + 1 >= u_trailCount) break;
    vec3 a = u_trailPts[i];
    vec3 b = u_trailPts[i + 1];
    vec2 ab = b.xy - a.xy;
    float h = clamp(dot(p - a.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float s = mix(a.z, b.z, h);
    float r = R * mix(1.2, 0.8, s);
    float d = length(p - a.xy - ab * h);
    best = max(best, exp(-d * d / (r * r)) * s);
  }
  if (u_trailCount == 1) {
    float d = length(p - u_trailPts[0].xy);
    best = exp(-d * d / (R * R)) * u_trailPts[0].z;
  }
  return mix(best, smoothstep(0.05, 0.8, best), 0.7);
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.08;
  float a = radians(u_angle);
  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
  float cs = u_cell * u_dpr;
  vec2 g = rot * frag / cs;
  vec2 cell = floor(g) + 0.5;
  vec2 center = transpose(rot) * (cell * cs);

  float tone = toneAt(center / u_res.y, t);
  float R = u_radius * u_dpr;
  float rest = exp(-pow(length(center - u_pointer) / R, 2.0));
  float trail = u_pointerAmt * max(liquidTrail(center, R, u_time * 0.5), rest * 0.6);
  tone = clamp(tone + trail * u_trailAmt, 0.0, 1.0);
  float fade = fadeAt(center / u_res);
  tone *= fade;

  // every dot stays on the grid; light makes it bigger and brighter
  float r = 0.5 * cs * u_dotSize * mix(u_minDot, 1.0, sqrt(tone)) * fade;
  float soft = 0.6 + u_softness * cs * 0.25;
  float d = length((g - cell) * cs);
  float m = 1.0 - smoothstep(r - soft, r + soft, d);

  vec3 bg = oklabToLinear(u_bg);
  vec3 dotColor = oklabToLinear(paletteRampLch(tone));
  // a faint glow between the brightest dots
  vec3 base = bg + dotColor * u_glow * 0.12 * tone * tone;
  return mix(base, dotColor, m);
}
`,i=[`#1b2533`,`#5c7a9a`,`#c9d6e0`,`#f6ecdc`],a={edges:0,top:1,bottom:2,left:3,right:4};function o({colors:t=i,speed:o=1,animate:s=!0,interactive:c=!0,grain:l=0,seed:u=0,spacing:d=7,dotSize:f=.95,minDot:p=.3,angle:m=0,frequency:h=1.3,flow:g=1.2,bandWidth:_=1,contrast:v=1.1,glow:y=.5,softness:b=0,fade:x=0,fadeFrom:S=`edges`,background:C=`#050608`,radius:w=70,trailStrength:T=.85,trailLength:E=.9,follow:D=.55,...O}){return(0,n.jsx)(e,{shader:r,uniforms:{u_cell:d,u_dotSize:f,u_minDot:p,u_angle:m,u_frequency:h,u_flow:g,u_bandWidth:_,u_contrast:v,u_glow:y,u_softness:b,u_fade:x,u_fadeFrom:a[S]??0,u_radius:w,u_trailAmt:T},colors:t,speed:o,animate:s,interactive:c,grain:l,seed:u,background:C,follow:D,trailLife:E,maxDpr:2,fallback:(e,n)=>`radial-gradient(${t[1]??t[0]} ${d*.2}px, transparent ${d*.2+.5}px) 0 0 / ${d}px ${d}px, ${n}`,...O})}function s(){return(0,n.jsx)(o,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{s as default};