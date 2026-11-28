import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{t}from"./index-TChZs6Gr.js";var n=t(),r=`
uniform float u_angle;  // direction of the folds, degrees
uniform float u_folds;  // how many folds fit across the frame
uniform float u_depth;  // how deep the folds are
uniform float u_flow;   // how much the folds wander
uniform float u_creases; // soft creases across the folds
uniform float u_sheen;  // strength of the streak along the threads
uniform float u_gloss;  // how tight that streak is

vec2 rot(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// bend: the slow wander of the folds; crease: where the cloth bunches up (both shared by the slope samples)
float height(vec2 frag, float bend, float crease, float t) {
  vec2 q = rot(frag / u_res.y, radians(u_angle)) * u_folds * 3.5;
  float h = 0.62 * sin(q.y * 3.0 + bend * 2.6 + t * 0.6 + 0.7 * sin(q.x * 1.3 + t * 0.4))
    + 0.26 * sin(q.y * 6.4 + q.x * 0.9 + bend * 4.2 - t * 0.9)
    + 0.05 * sin(q.y * 11.0 - q.x * 1.4 + bend * 5.0 + t * 1.1);
  // creases run at a steep angle to the folds
  vec2 qc = rot(q, 1.1);
  h += 0.22 * u_creases * crease * sin(qc.y * 5.0 + bend * 3.0 - t * 0.5);
  return h;
}

vec3 ramp(float v) {
  return oklabToLinear(paletteRampLch(v));
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.3;
  vec2 p = frag / u_res.y;
  vec2 pa = rot(p, radians(u_angle)) * u_folds;
  float bend = u_flow * snoise(vec3(pa * vec2(0.8, 1.45), t * 0.35));
  float crease = smoothstep(0.1, 0.7, snoise(vec3(pa * 0.9 + 3.7, t * 0.2)));

  float eps = 1.5 * u_dpr;
  float h0 = height(frag, bend, crease, t);
  float hx = height(frag + vec2(eps, 0.0), bend, crease, t);
  float hy = height(frag + vec2(0.0, eps), bend, crease, t);
  // slope per unit of fold space, so depth means the same at any fold count
  vec2 g = vec2(hx - h0, hy - h0) / eps * u_res.y / (u_folds * 3.5);
  vec3 n = normalize(vec3(-g * 0.45 * u_depth, 1.0));

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 key = normalize(vec3(-0.45, 0.6, 0.65));
  vec3 fill = normalize(vec3(0.6, -0.5, 0.6));
  float diff = max(dot(n, key), 0.0);
  float back = max(dot(n, fill), 0.0);

  // the threads run along the folds, and satin's highlight stretches along them: it lights the
  // slopes that face the light, kept tight across the threads and long along them
  vec2 along = rot(vec2(1.0, 0.0), -radians(u_angle));
  vec3 T = normalize(vec3(along, 0.0) - n * dot(n, vec3(along, 0.0)));
  vec3 H = normalize(key + V);
  vec3 nAcross = normalize(n - T * dot(n, T) * 0.85);
  float nh = max(dot(nAcross, H), 0.0);
  float spec = pow(nh, 30.0 + 250.0 * u_gloss) * 1.5 + pow(nh, 6.0) * 0.18;
  // a faint weave across the threads
  float weave = 0.95 + 0.05 * sin(dot(frag / u_dpr, vec2(-along.y, along.x)) * 2.4);

  // valleys fall into shadow, tinted rather than black
  float ao = mix(0.5, 1.0, smoothstep(-1.0, 0.9, h0));
  float v = clamp(0.07 + 0.86 * pow(diff, 1.7) * ao + 0.2 * back * ao + 0.04 * bend, 0.0, 1.0);
  vec3 c = ramp(v);
  float rim = pow(1.0 - n.z, 1.2) * smoothstep(-0.2, 0.6, dot(n.xy, normalize(key.xy)));
  c += ramp(0.8) * rim * 0.35 * u_sheen;
  c += ramp(1.0) * spec * weave * u_sheen * 0.6 * ao;
  return c;
}
`,i=[`#0f0308`,`#3d0a20`,`#8a1d44`,`#d4607f`,`#ffd9e3`];function a({colors:t=i,speed:a=1,animate:o=!0,grain:s=.075,seed:c=0,angle:l=-25,folds:u=.8,depth:d=1,flow:f=1,creases:p=.6,sheen:m=1,gloss:h=.4,...g}){return(0,n.jsx)(e,{shader:r,uniforms:{u_angle:l,u_folds:u,u_depth:d,u_flow:f,u_creases:p,u_sheen:m,u_gloss:h},colors:t,speed:a,animate:o,interactive:!1,grain:s,seed:c,fallback:()=>{let e=t[0],n=t[Math.floor(t.length/2)],r=t[t.length-1];return`repeating-linear-gradient(${90-l}deg, ${e} 0, ${n} 6%, ${r} 9%, ${n} 12%, ${e} 20%)`},...g})}function o(){return(0,n.jsx)(a,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{o as default};