import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{n as t}from"./shades-D71_bJkU.js";import{t as n}from"./index-TChZs6Gr.js";var r=n(),i=`
uniform float u_scale;  // size of the shapes
uniform float u_offset; // misregistration, css px
uniform float u_dot;    // grain size, css px
uniform float u_grit;   // 0 crisp grain .. 1 soft
uniform float u_paper;  // paper texture strength
uniform float u_shake;  // how far the wake and presses push the layers apart

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * snoise(p);
    p = p * 1.95 + vec3(3.1, 7.7, 0.4);
    amp *= 0.45;
  }
  return sum;
}

// one ink: density at the misregistered spot (fields are smooth, so a first-order step is plenty),
// read through its own grain
float ink(vec4 field, vec2 grad1, vec2 grad2, vec2 off, vec2 at, float idx, float press) {
  float f = field.x + dot(grad1, off);
  float g = field.y + dot(grad2, off);
  float d;
  // a broad soft wash, a mid layer, and a few firmer shapes on top. Wide, overlapping ramps, so
  // each ink fades through the others instead of stopping at an edge.
  if (idx < 0.5) d = smoothstep(-0.55, 0.45, f) * 0.9;
  else if (idx < 1.5) d = smoothstep(-0.3, 0.5, g - f * 0.5) * 0.88;
  else d = smoothstep(-0.05, 0.4, -f * 0.6 - g * 0.6) * 0.9;
  d = min(d + press * smoothstep(0.0, 0.3, d), 1.0);
  float cell = max(u_dot * u_dpr, 1.0);
  // one threshold per speck, stepped by the golden ratio for each ink: where inks are light their
  // specks fall side by side and mix optically, and only stack (and darken) where they're dense
  float n = fract(hash12(floor(at / cell)) + idx * 0.618034);
  float soft = 0.03 + u_grit * 0.4;
  return smoothstep(n - soft, n + soft, d);
}

vec3 shade(vec2 frag) {
  vec2 at = frag;
  vec2 p = at / u_res.y * (0.9 / u_scale);
  float t = u_time * 0.05;

  vec2 q = vec2(fbm(vec3(p, t)), fbm(vec3(p + vec2(5.2, 1.3), t)));
  float f = fbm(vec3(p + 0.9 * q, t * 0.8));
  float g = q.x * 1.2 - q.y * 0.6;
  vec4 field = vec4(f, g, 0.0, 0.0);
  vec2 gf = vec2(dFdx(f), dFdy(f));
  vec2 gg = vec2(dFdx(g), dFdy(g));

  float off = u_offset * u_dpr;

  // the wake the pointer leaves while moving
  // outward from the pointer, easing to nothing right under it so the split has no pinhole
  vec2 away = at - u_pointer;
  away *= smoothstep(0.0, 40.0 * u_dpr, length(away)) / max(length(away), 1e-3);
  float wake = trailField(frag, 60.0 * u_dpr);
  // presses: rings travelling out from where they landed, pushing outward as they pass
  vec2 ringPush = vec2(0.0);
  float ring = 0.0;
  for (int i = 0; i < RIPPLE_COUNT; i++) {
    vec3 r = u_ripples[i];
    if (r.z < 0.0 || r.z > 3.0) continue;
    vec2 d = frag - r.xy;
    float len = max(length(d), 1e-3);
    float dd = (len - r.z * 300.0 * u_dpr) / (26.0 * u_dpr);
    float life = 1.0 - r.z / 3.0;
    float w = exp(-dd * dd) * smoothstep(0.0, 0.35, life);
    ring += w;
    ringPush += d / len * w;
  }
  vec2 push = (away * wake * 22.0 + ringPush * 18.0) * u_shake * u_dpr;
  // ink lands heavier where a ring passes
  float press = ring * 0.15 * u_shake;

  vec3 col = oklabToLinear(u_colors[0]);
  int inks = min(u_count - 1, 3);
  for (int i = 0; i < 3; i++) {
    if (i >= inks) break;
    float fi = float(i);
    // each layer drifts on its own slow orbit
    float a = fi * 2.1 + t * (1.4 + fi * 0.3);
    vec2 o = vec2(cos(a), sin(a)) * off * (0.6 + 0.4 * sin(t * 2.0 + fi * 1.7));
    // the push splits the layers: the first moves in, the others out by different amounts
    o += push * (fi * 0.9 - 0.8);
    float c = ink(field, gf, gg, o, at, fi, press);
    // overprint: inks multiply the paper and each other. Riso ink is translucent and the paper
    // glows through it, so an ink multiplies as a slightly lighter version of itself, which keeps
    // overlaps vivid instead of muddy.
    vec3 inkCol = pow(max(oklabToLinear(u_colors[i + 1]), 0.0), vec3(0.82));
    col *= mix(vec3(1.0), inkCol, c * 0.9);
  }

  // paper: soft fibres and a faint mottle
  vec2 css = at / u_dpr;
  float fibre = snoise(vec3(css * vec2(0.012, 0.11), 3.0)) * 0.6 + snoise(vec3(css * 0.04, 7.0)) * 0.4;
  col *= 1.0 - u_paper * 0.05 * (fibre * 0.5 + 0.5);

  return col;
}
`,a=`#1f7a8c`,o=[[.975,.06,.25],[.8,.75,.08],[.6,1,0],[.4,.85,-.1]];function s({color:n=a,scale:s=1,offset:c=4,dot:l=2,grit:u=.55,paper:d=1,speed:f=1,animate:p=!0,interactive:m=!0,shake:h=1,seed:g=0,..._}){let v=t(n||a,o);return(0,r.jsx)(e,{shader:i,uniforms:{u_scale:s,u_offset:c,u_dot:l,u_grit:u,u_paper:d,u_shake:h},colors:v,speed:f,animate:p,interactive:m,follow:.6,ripples:!0,trailLife:1.4,grain:0,seed:g,fallback:()=>[`radial-gradient(ellipse 60% 50% at 25% 30%, ${v[1]}, transparent 70%)`,`radial-gradient(ellipse 55% 50% at 75% 70%, ${v[v.length-1]}, transparent 70%)`,v[0]].join(`, `),..._})}function c(){return(0,r.jsx)(s,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{c as default};