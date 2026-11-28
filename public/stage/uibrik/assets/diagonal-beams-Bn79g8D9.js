import{a as e,n as t}from"./ShaderSurface-DjQw_LIl.js";import{t as n}from"./index-TChZs6Gr.js";var r=n(),i=`
uniform float u_beams;     // strips per box height
uniform float u_size;      // size of the light
uniform float u_angle;     // direction the strips run, degrees
uniform float u_blur;      // how far the light's edge dissolves into grain
uniform float u_intensity; // exposure
uniform float u_rim;       // the highlight along each strip's bright edge
uniform float u_lean;      // how far the light leans toward the pointer
uniform float u_tilt;      // how much the strips twist along their length

// distance from the centre of the light, 1 at its edge: along a strip, and across to the strip's
// middle line, so every strip is lit evenly across its width and the lit parts end strip by strip
float reach(float along, float across, float size) {
  return length(vec2(along / (0.5 * size), across / (0.55 * size)));
}

float outCubic(float x) {
  x = 1.0 - clamp(x, 0.0, 1.0);
  return 1.0 - x * x * x;
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.4;
  // units of height, or of width on a tall, narrow box, so the light still fits a phone
  float unit = min(u_res.y, u_res.x * 1.2);
  vec2 p = (frag - 0.5 * u_res) / unit - vec2(0.03, 0.02);
  float a = radians(u_angle);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 nrm = vec2(-dir.y, dir.x);

  // per-pixel random offsets (a rough Gaussian): about a pixel for the fold edges, so they are
  // antialiased, and much wider for the light and the shadow, so those turn to grain
  vec2 g = floor(frag / u_dpr);
  vec2 j = vec2(hash12(g) + hash12(g + 7.1), hash12(g + 3.3) + hash12(g + 9.9)) - 1.0;

  // which strip, and where across it: 0 at its crisp lit edge, 1 deepest in its shadow
  float gap = 1.0 / max(u_beams, 1.0);
  float f = dot(p + j * (0.6 * u_dpr / unit), nrm) / gap;
  float k = floor(f);
  float x = f - k;
  float h1 = hash12(vec2(k, 5.3));
  float h2 = hash12(vec2(k, 17.9));

  // the intro: the light grows from a point
  float size = max(u_size * outCubic(u_age / 1.6), 1e-3);

  // the light drifts slowly and leans a little toward the pointer
  vec2 c = vec2(0.04 * sin(t * 0.21), 0.03 * cos(t * 0.27));
  vec2 m = (u_pointer - 0.5 * u_res) / unit - vec2(0.03, 0.02);
  c += (m - c) * 0.12 * u_lean * u_pointerAmt;

  // each strip catches the light a little further along or back, and drifts slowly
  float shift = (h1 - 0.5) * 0.26 + 0.035 * sin(t * (0.4 + 0.3 * h2) + h2 * 6.28);
  vec2 d = p - c + dir * shift + j * 0.03 * u_blur * size;
  float mid = (k + 0.5) * gap - dot(c, nrm);
  float r = reach(dot(d, dir), mid + dot(j, nrm) * 0.01, size) * (1.0 + 0.03 * snoise(vec3(p * 1.2, t * 0.2)));
  // a broad, even plateau of light that ends quickly, and a far fainter glow reaching past it
  float core = 1.0 - smoothstep(0.55, 1.0, r);
  float wide = 1.0 - smoothstep(0.3, 1.45, r);

  // each strip twists slowly along its length; where it turns edge-on less light gets through, so
  // its face dims and its shadow widens. Read from the grainy spot too, so the dips dissolve.
  float u = dot(p, dir);
  float uj = u + dot(j, dir) * 0.05 * u_blur;
  float twist = snoise(vec3(uj * 2.6 - t * 0.12 + h1 * 7.0, k * 0.83, t * 0.08 + h2 * 3.0));
  float turn = clamp(smoothstep(0.12, 0.55, twist) * u_tilt, 0.0, 1.0);
  // edge-on, a strip still glows faintly, in the deep shades
  float pass = mix(1.0, 0.22, turn);
  // light flowing gently along each strip, so neighbours are lit a little differently
  float flow = 0.9 + 0.14 * snoise(vec3(u * 1.6 - t * 0.5, k * 0.7, t * 0.12 + h1 * 9.0));
  // the face turns away from the light: full from the crisp edge, then a grainy fall into shadow
  float xs = x + dot(j, nrm) * 0.12 * u_blur;
  float edge = mix(0.64, 0.3, turn);
  float face = mix(0.08, 1.0, 1.0 - smoothstep(edge, 1.02, xs));
  float body = core * face * flow * pass;
  // the crisp edge keeps a thin highlight out into the dark, and the face a faint glow
  // the highlight fades with distance from the light and is gone well before the frame's edge
  float fade = 1.0 - smoothstep(0.7, 1.35, r);
  float rim = (1.0 - smoothstep(0.0, 0.07, x)) * fade * fade * 0.5 * u_rim;
  float ambient = wide * wide * 0.06 * face;

  // brightening as it grows, with a quick fade in from the dark at the very start
  float b = (max(body, rim) + ambient) * u_intensity * smoothstep(0.1, 2.0, u_age);
  vec3 col = oklabToLinear(paletteRamp(clamp(pow(b, 0.7) * 0.7, 0.0, 1.0)));
  return mix(oklabToLinear(u_bg), col, smoothstep(0.0, 0.1, b) * smoothstep(0.0, 0.6, u_age));
}
`,a=`#e5373f`,o=`#060608`,s=[[.2,.45,-.12],[.38,.8,-.06],[.58,1,0],[.73,.7,.04],[.87,.32,.07]],c=e=>{let t=e<=.0031308?e*12.92:1.055*e**(1/2.4)-.055;return Math.round(Math.min(1,Math.max(0,t))*255).toString(16).padStart(2,`0`)};function l(e,t,n){for(let r=0;r<24;r++,t*=.9){let i=t*Math.cos(n),a=t*Math.sin(n),o=(e+.3963377774*i+.2158037573*a)**3,s=(e-.1055613458*i-.0638541728*a)**3,l=(e-.0894841775*i-1.291485548*a)**3,u=[4.0767416621*o-3.3077115913*s+.2309699292*l,-1.2684380046*o+2.6097574011*s-.3413193965*l,-.0041960863*o-.7034186147*s+1.707614701*l];if(u.every(e=>e>=-.001&&e<=1.001)||r===23)return`#${u.map(c).join(``)}`}return`#000000`}function u(t){let[,n,r]=e(t),i=Math.hypot(n,r),a=Math.atan2(r,n);return s.map(([e,t,n])=>l(e,i*t,a+n))}function d({color:e=a,colors:n,count:s=7,size:c=1,angle:l=-50,blur:d=1,rim:f=.7,intensity:p=1,lean:m=1,tilt:h=1,background:g=o,speed:_=1,animate:v=!0,interactive:y=!0,grain:b=.03,...x}){let S=n?.filter(Boolean).slice(0,6),C=S&&S.length>=2?S:u(e||a),w=C[Math.floor(C.length/2)];return(0,r.jsx)(t,{shader:i,uniforms:{u_beams:Math.max(1,Math.round(s)),u_size:c,u_angle:l,u_blur:d,u_rim:f,u_intensity:p,u_lean:m,u_tilt:h},colors:C,speed:_,animate:v,interactive:y,grain:b,background:g,follow:.85,fallback:(e,t)=>`radial-gradient(ellipse 34% 42% at 52% 47%, transparent 20%, ${t} 100%), repeating-linear-gradient(${90-l}deg, ${w}99 0 6.9%, ${w}55 6.9% 13.8%), ${t}`,...x})}function f(){return(0,r.jsx)(d,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{f as default};