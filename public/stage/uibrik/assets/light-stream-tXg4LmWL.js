import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{t}from"./index-TChZs6Gr.js";var n=t(),r=`
uniform float u_intensity; // exposure
uniform float u_density;   // how many streaks
uniform float u_waist;     // width of the stream at its narrowest
uniform float u_flare;     // how much it opens toward the ends
uniform float u_curve;     // how much the stream bends and sways
uniform float u_angle;     // tilt, degrees
uniform float u_length;    // length of the streak dashes
uniform float u_glow;      // halo around each streak and haze around the core
uniform float u_chroma;    // colour fringing at the edges of the streaks
uniform float u_white;     // how much the hottest light burns to white
uniform float u_dust;      // glittering dust along the stream
uniform float u_dustSize;  // size of the sparks
uniform float u_dustGlow;  // how many sparks carry a soft halo
uniform float u_direction; // 1 flows up, -1 flows down
uniform float u_lean;      // how far the stream bends toward the pointer

// one streak profile per colour channel, split a little apart: the chromatic fringe
vec3 profile(float d, float width, float spread) {
  float split = u_chroma * width * 0.8;
  vec3 x = vec3(d - split, d, d + split) / width;
  // a sharp core and a wide, faint halo: the glow
  return exp(-x * x) + exp(-x * x / (spread * spread)) * 0.05 * u_glow;
}

// one layer of streaks: n lines across the stream
vec3 streaks(float s, float y, float t, float n, float layer) {
  float x = s * n;
  float id = floor(x);
  float f = fract(x) - 0.5;
  float h1 = hash12(vec2(id, layer));
  float h2 = hash12(vec2(id, layer + 17.0));
  float h3 = hash12(vec2(id, layer + 41.0));
  float width = mix(0.06, 0.24, h2 * h2);
  vec3 line = profile(f - (h1 - 0.5) * 0.6, width, 4.0);
  // dashes running along the flow, each line at its own pace
  float flowY = y * 2.2 / u_length - t * u_direction * (0.8 + 0.8 * h3);
  float dash = smoothstep(0.42, 0.92, snoise(vec3(id * 0.37 + layer, flowY, h1 * 7.0)) * 0.5 + 0.5);
  // a few lines burn bright, the rest are fine threads
  float bright = dash * (0.12 + 1.5 * h3 * h3);
  // neighbouring lines share a hue (slow noise across the stream, a little jitter per line), so
  // whole bundles glow one colour instead of every line averaging out to beige
  float hue = 0.5 + 0.55 * snoise(vec3(s * 1.1 + layer * 0.3, y * 0.5 - t * 0.08, layer * 3.0)) + (h1 - 0.5) * 0.12;
  vec3 tint = mix(oklabToLinear(paletteLoop(hue)), vec3(1.0), 0.1);
  return tint * line * bright;
}

// a few broad, short flares of near-white light: the hot glints along the stream
vec3 flares(float s, float y, float t) {
  float x = s * 7.0 * u_density;
  float id = floor(x);
  float f = fract(x) - 0.5;
  float h1 = hash12(vec2(id, 91.0));
  float h3 = hash12(vec2(id, 133.0));
  vec3 line = profile(f - (h1 - 0.5) * 0.5, 0.3, 2.5);
  float flowY = y * 1.4 / u_length - t * u_direction * (0.6 + 0.5 * h3);
  float dash = smoothstep(0.66, 1.0, snoise(vec3(id * 0.71 + 40.0, flowY, h1 * 5.0)) * 0.5 + 0.5);
  vec3 tint = mix(vec3(1.0), oklabToLinear(paletteLoop(h1)), 0.3);
  return tint * line * dash * 2.4;
}

// where a point sits in the stream: s across it (-1..1 inside), y along it, and squeeze, how much
// the light is concentrated there (the waist burns brightest)
vec3 stream(vec2 frag, float t) {
  vec2 p = (frag - 0.5 * u_res) / u_res.y;
  float a = radians(u_angle);
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  float y = p.y;

  // the stream's centre line sways, and bends toward the pointer
  float bend = u_curve * (0.16 * sin(y * 2.4 + t * 0.25) + 0.06 * sin(y * 5.1 - t * 0.4) + 0.1 * y * y * sign(y));
  vec2 m = (u_pointer - 0.5 * u_res) / u_res.y;
  m = mat2(cos(a), -sin(a), sin(a), cos(a)) * m;
  bend += (m.x - bend) * u_lean * 0.35 * exp(-pow((y - m.y) * 2.0, 2.0)) * u_pointerAmt;

  float w = u_waist + u_flare * y * y;
  return vec3((p.x - bend) / w, y, clamp((u_waist + u_flare * 0.12) / w, 0.35, 2.2));
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.35;
  vec3 at = stream(frag, t);
  float s = at.x;
  float y = at.y;
  float squeeze = at.z;
  float env = smoothstep(1.2, 0.2, abs(s)) * squeeze;

  vec3 c = vec3(0.0);
  c += streaks(s, y, t, 18.0 * u_density, 1.0) * 1.3;
  c += streaks(s, y, t * 1.15, 44.0 * u_density, 2.0) * 0.9;
  c += streaks(s, y, t * 1.3, 100.0 * u_density, 3.0) * 0.22;
  c += flares(s, y, t);
  // darker channels winding through the stream, so it splits into bundles
  float bundles = 0.18 + 0.82 * smoothstep(-0.25, 0.55, snoise(vec3(s * 2.2, y * 0.7 - t * 0.15 * u_direction, 3.0)));
  c *= env * bundles;

  // a warm haze around the core
  vec3 warm = mix(oklabToLinear(u_colors[0]), vec3(1.0), 0.45);
  c += warm * exp(-s * s * 2.2) * squeeze * bundles * bundles * u_glow * 0.09;

  // glittering dust, only along the stream: thickest in its body and clinging to its edges. Each
  // spark has its own size (most are tiny, a few are larger) and about one in six carries a soft
  // halo. Halos reach past a spark's own cell, so each pixel looks at the cells around it too.
  // (each spark is decided at its own spot, so neighbouring pixels always agree on it)
  if (u_dust > 0.0 && abs(s) < 2.2) {
    float cs = 8.0 * u_dpr;
    vec2 home = floor(frag / cs);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 cell = home + vec2(float(i), float(j));
        float hd = hash12(cell + 0.5);
        vec2 spot = (cell + vec2(hash12(cell + 3.1), hash12(cell + 7.7))) * cs;
        vec3 sa = stream(spot, t);
        float odds = 0.32 * smoothstep(1.7, 0.75, abs(sa.x)) * clamp(sa.z, 0.5, 1.5) * u_dust;
        if (hd < 1.0 - odds) continue;
        float hs = hash12(cell + 11.3);
        float r = (0.22 + 0.75 * hs * hs * hs) * u_dustSize * u_dpr;
        float d2 = dot(frag - spot, frag - spot);
        float core = exp(-d2 / (r * r));
        // the halo stays within the neighbouring cells, so it's never cut off
        float glowR = min(r * 3.0 + 1.2 * u_dpr, cs * 0.45);
        float halo = step(1.0 - 0.16 * u_dustGlow, hash12(cell + 19.9)) * exp(-d2 / (glowR * glowR)) * 0.3;
        float twinkle = 0.5 + 0.5 * sin(u_time * (1.5 + 3.0 * hd) + hd * 40.0);
        vec3 tint = mix(vec3(1.0, 0.86, 0.7), vec3(1.0), hs);
        c += tint * (core + halo) * (0.35 + 0.9 * twinkle) * (0.6 + 0.6 * hs);
      }
    }
  }

  // the hottest light loses its colour and burns white
  float lum = dot(c, vec3(0.3, 0.5, 0.2));
  c = mix(c, vec3(lum), smoothstep(0.9, 3.0, lum) * 0.75 * u_white);
  // filmic: bright crossings roll off to white instead of clipping
  c = 1.0 - exp(-c * u_intensity * 2.0);
  return oklabToLinear(u_bg) + c;
}
`,i=[`#ff6a1a`,`#ffb04a`,`#fff0dc`,`#ff7d2e`,`#5fe3d3`,`#9a78ff`];function a({colors:t=i,speed:a=1.1,animate:o=!0,interactive:s=!0,grain:c=.065,seed:l=0,intensity:u=1.35,density:d=.85,waist:f=.1,flare:p=1.55,curve:m=1,angle:h=-32,length:g=.55,glow:_=1,chroma:v=.9,white:y=.8,dust:b=.5,dustSize:x=.6,dustGlow:S=.5,direction:C=`up`,background:w=`#050505`,lean:T=.4,follow:E=.8,...D}){return(0,n.jsx)(e,{shader:r,uniforms:{u_intensity:u,u_density:d,u_waist:f,u_flare:p,u_curve:m,u_angle:h,u_length:g,u_glow:_,u_chroma:v,u_white:y,u_dust:b,u_dustSize:x,u_dustGlow:S,u_direction:C===`down`?-1:1,u_lean:T},colors:t,speed:a,animate:o,interactive:s,grain:c,seed:l,background:w,follow:E,fallback:(e,n)=>`radial-gradient(ellipse 18% 60% at 50% 50%, ${t[1]??t[0]}cc, ${t[0]}55 45%, transparent 75%), ${n}`,...D})}function o(){return(0,n.jsx)(a,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{o as default};