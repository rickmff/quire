import{a as e,n as t}from"./ShaderSurface-DjQw_LIl.js";import{t as n}from"./index-TChZs6Gr.js";var r=n(),i=`
uniform float u_curve;    // how strongly the bands arch
uniform float u_reach;    // how far down the dark reaches
uniform float u_softness; // how gradual the bands are
uniform float u_direction; // edge the dark comes from: 0 top, 1 right, 2 bottom, 3 left
uniform float u_intro;    // seconds the bands take to rise in
uniform float u_bulge;    // how far the bands bow toward the pointer (0 off)

// palette as a smooth curve through the stops (Catmull-Rom, in OKLab). Easing into each stop, as
// the shared ramp does, leaves a plateau at every colour; straight blends leave a crease instead,
// where the rate of change jumps, and the eye reads both as stripes in a gradient this large. A
// curve keeps the rate of change continuous, so the bands melt into each other. The ends repeat,
// so the curve settles gently into the darkest and lightest colours.
vec3 stop(int i) {
  return u_colors[clamp(i, 0, u_count - 1)];
}

float spline(float a, float b, float c, float d, float s) {
  return 0.5 * (2.0 * b + (c - a) * s + (2.0 * a - 5.0 * b + 4.0 * c - d) * s * s + (3.0 * (b - c) + d - a) * s * s * s);
}

vec3 rampSmooth(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  float s = f - float(i);
  vec3 a = stop(i - 1), b = stop(i), c = stop(i + 1), d = stop(i + 2);
  vec3 lab = vec3(spline(a.x, b.x, c.x, d.x, s), spline(a.y, b.y, c.y, d.y, s), spline(a.z, b.z, c.z, d.z, s));
  // chroma follows its own curve, so a blend between two hues stays as vivid as its ends instead
  // of sagging toward grey through the middle
  float chroma = max(spline(length(a.yz), length(b.yz), length(c.yz), length(d.yz), s), 0.0);
  float len = length(lab.yz);
  if (len > 1e-4) lab.yz *= chroma / len;
  lab.x = clamp(lab.x, 0.0, 1.0);
  return lab;
}

float outCubic(float x) {
  x = 1.0 - clamp(x, 0.0, 1.0);
  return 1.0 - x * x * x;
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.1;
  // the intro: 0 all light, 1 the bands in place
  float rise = outCubic(u_age / max(u_intro, 0.01));
  // turn the box so the dark edge is on top; everything below works in that frame
  vec2 f = frag;
  vec2 res = u_res;
  if (u_direction > 2.5) {
    f = vec2(frag.y, u_res.x - frag.x);
    res = u_res.yx;
  } else if (u_direction > 1.5) {
    f = u_res - frag;
  } else if (u_direction > 0.5) {
    f = vec2(u_res.y - frag.y, frag.x);
    res = u_res.yx;
  }
  float aspect = res.x / res.y;
  // x across in units of height, y down from the dark edge
  vec2 p = vec2((f.x / res.x - 0.5) * aspect, 1.0 - f.y / res.y);
  // a narrow box keeps some arch instead of flattening it out
  float k = 1.66 * max(aspect / 1.6, 0.6) / max(u_curve * mix(0.6, 1.0, rise), 0.05);
  vec2 c = vec2(0.05 * sin(t * 0.7), -0.55 + 0.018 * sin(t * 1.1));
  float d = length(vec2((p.x - c.x) / k, p.y - c.y));
  // the arch is strongest near the dark and eases off toward the light, so the lowest bands lie
  // nearly level, as a horizon does
  d = mix(d, p.y - c.y, 0.55 * smoothstep(0.8, 1.35, d));
  d += 0.022 * snoise(vec3(p * 1.1, t * 0.6));
  d -= (u_reach - 1.0) * 0.25 - (1.0 - rise) * 1.1;
  // the pointer draws the dark toward it: a soft swell around it (a short comet while it moves)
  // that eases away when it leaves
  if (u_bulge > 0.0) {
    float pd = pointerDist(frag, 0.5) / (0.32 * u_res.y);
    d -= u_bulge * u_pointerAmt * exp(-pd * pd);
  }
  // eased at both ends, so the black and the white are met without a visible edge; only half a
  // smoothstep, since the curve itself already settles into its ends
  float x = clamp((d - 0.66) / (0.7 * u_softness), 0.0, 1.0);
  x = mix(x, x * x * (3.0 - 2.0 * x), 0.5);
  // a short fade in from the lightest shade at the very start
  return mix(oklabToLinear(u_colors[u_count - 1]), oklabToLinear(rampSmooth(x)), smoothstep(0.0, 0.6, u_age));
}
`,a=`#2b35d6`,o=[[.02,.05,.08],[.22,.75,.05],[.42,1,0],[.62,.75,-.04],[.86,.3,-.06],[.995,.02,-.08]],s=e=>{let t=e<=.0031308?e*12.92:1.055*e**(1/2.4)-.055;return Math.round(Math.min(1,Math.max(0,t))*255).toString(16).padStart(2,`0`)};function c(e,t,n){for(let r=0;r<24;r++,t*=.9){let i=t*Math.cos(n),a=t*Math.sin(n),o=(e+.3963377774*i+.2158037573*a)**3,c=(e-.1055613458*i-.0638541728*a)**3,l=(e-.0894841775*i-1.291485548*a)**3,u=[4.0767416621*o-3.3077115913*c+.2309699292*l,-1.2684380046*o+2.6097574011*c-.3413193965*l,-.0041960863*o-.7034186147*c+1.707614701*l];if(u.every(e=>e>=-.001&&e<=1.001)||r===23)return`#${u.map(s).join(``)}`}return`#000000`}function l(t){let[,n,r]=e(t),i=Math.hypot(n,r),a=Math.atan2(r,n);return o.map(([e,t,n])=>c(e,i*t,a+n))}var u=[`top`,`right`,`bottom`,`left`],d={top:`ellipse 140% 95% at 50% -40%`,right:`ellipse 95% 140% at 140% 50%`,bottom:`ellipse 140% 95% at 50% 140%`,left:`ellipse 95% 140% at -40% 50%`};function f({color:e=a,colors:n,direction:o=`top`,curve:s=1,reach:c=1,softness:f=1.1,speed:p=1,grain:m=.1,intro:h=2.4,bulge:g=0,maxDpr:_=1,...v}){let y=n?.filter(Boolean).slice(0,6),b=y&&y.length>=2?y:l(e||a);return(0,r.jsx)(t,{shader:i,uniforms:{u_direction:Math.max(0,u.indexOf(o)),u_curve:s,u_reach:c,u_softness:f,u_intro:h,u_bulge:g},colors:b,speed:p,animate:!0,interactive:g>0,grain:m,maxDpr:_,fallback:()=>`radial-gradient(${d[o]??d.top}, ${b.map((e,t)=>`${e} ${Math.round(58+t/(b.length-1)*42)}%`).join(`, `)})`,...v})}function p(){return(0,r.jsx)(f,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{p as default};