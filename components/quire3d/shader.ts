// The quire, ray traced: seven glass sheets, each one a captured component.
// One fullscreen pass. Every sheet is a plane with a rounded-rect footprint,
// so the intersection is analytic and the edges are antialiased from the SDF.

export const SHEETS = 7;

export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision highp float;

#define N ${SHEETS}
const float TAU = 6.2831853;
const vec2 HALF = vec2(1.0, 0.75);
const float RAD = 0.085;
const float THICK = 0.014;
const vec3 INK = vec3(0.067);

uniform vec2 uCenter;
uniform float uUnit;
uniform vec4 uG[N];
uniform vec3 uHover;
uniform float uTime;
uniform float uDark;
uniform float uFov;
uniform vec3 uCamPos;
uniform mat3 uCam;
uniform vec3 uC[N];
uniform mat3 uR[N];
uniform float uPres[N];
uniform vec2 uPointer;
uniform vec3 uLight;
uniform float uGlint;
uniform float uFloorY;
uniform float uIntro;
uniform sampler2D uLabels;

out vec4 outColor;

float sdRR(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(
    vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
    vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
    vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float fillA(float d, float e) { return clamp(0.5 - d / e, 0.0, 1.0); }
float strokeA(float d, float w, float e) { return fillA(abs(d) - w, e); }
float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
float spring(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - exp(-7.0 * x) * cos(10.0 * x); }

// A glyph is (tone, alpha): tone 0 is ink, tone 1 is white. Layers go on with "over".
void over(inout vec2 g, float tone, float a) {
  float oa = a + g.y * (1.0 - a);
  g.x = oa > 1e-4 ? (tone * a + g.x * g.y * (1.0 - a)) / oa : 0.0;
  g.y = oa;
}

vec2 gSwitch(vec2 p, float e, vec4 s) {
  vec2 g = vec2(0.0);
  float k = s.x, kc = clamp(k, 0.0, 1.0);
  float tr = sdRR(p, vec2(0.36, 0.19), 0.19);
  over(g, 0.0, fillA(tr, e) * mix(0.16, 0.92, kc));
  over(g, 0.0, strokeA(tr, 0.005, e) * 0.45);
  float kn = sdRR(p - vec2(mix(-0.17, 0.17, k), 0.0), vec2(0.135 + s.y, 0.135 - s.y * 0.25), 0.135 - s.y * 0.25);
  over(g, 0.0, fillA(kn - 0.012, e * 3.0) * 0.18);
  over(g, 1.0, fillA(kn, e));
  return g;
}

vec2 gButton(vec2 p, float e, vec4 st, float t) {
  vec2 g = vec2(0.0);
  float press = st.x, rr = clamp(st.y, 0.0, 1.0);
  float s = 1.0 + 0.035 * st.z - 0.07 * press;
  vec2 bp = p / s;
  vec2 hb = vec2(0.46, 0.135);
  float grow = 0.17 * (1.0 - pow(1.0 - rr, 3.0));
  over(g, 0.0, strokeA(sdRR(p, hb + grow, 0.07 + grow), 0.006, e) * (1.0 - rr) * (1.0 - rr) * 0.6);
  float b = sdRR(bp, hb, 0.07) * s;
  over(g, 0.0, fillA(b, e) * 0.93);
  float band = exp(-pow((bp.x + bp.y * 0.6 - mix(-0.9, 0.9, fract(t * 0.42))) / 0.09, 2.0));
  over(g, 1.0, fillA(b + 0.004, e) * band * 0.38);
  over(g, 1.0, fillA(sdRR(bp - vec2(0.05, 0.0), vec2(0.17, 0.02), 0.02) * s, e) * 0.96);
  over(g, 1.0, strokeA((length(bp - vec2(-0.2, 0.0)) - 0.036) * s, 0.011, e) * 0.96);
  // The demo pointer. It leaves when a real one arrives.
  float go = st.w;
  if (go > 0.001) {
    vec2 cp = mix(vec2(0.78, -0.5), vec2(0.24, -0.05), go);
    float cs = 1.0 - 0.14 * press;
    vec2 q = (p - cp) / cs;
    float ar = sdTri(q, vec2(0.0), vec2(0.0, -0.125), vec2(0.088, -0.088)) * cs - 0.006;
    float ca = smoothstep(0.0, 0.12, go);
    over(g, 0.0, fillA(ar - 0.014, e) * ca);
    over(g, 1.0, fillA(ar, e) * ca);
  }
  return g;
}

vec2 gSlider(vec2 p, float e, vec4 s) {
  vec2 g = vec2(0.0);
  float v = clamp(s.x, 0.0, 1.0);
  float x = mix(-0.56, 0.56, v);
  p.y += 0.08;
  over(g, 0.0, fillA(sdSeg(p, vec2(-0.56, 0.0), vec2(0.56, 0.0)) - 0.02, e) * 0.17);
  over(g, 0.0, fillA(sdSeg(p, vec2(-0.56, 0.0), vec2(x, 0.0)) - 0.02, e) * 0.93);
  float th = length(p - vec2(x, 0.0)) - 0.078 * (1.0 + 0.22 * s.y);
  over(g, 0.0, fillA(th - 0.014, e));
  over(g, 1.0, fillA(th, e));
  vec2 bq = p - vec2(x, 0.235 + 0.03 * s.y);
  float bub = min(sdRR(bq, vec2(0.092, 0.058), 0.03), sdTri(bq, vec2(-0.03, -0.05), vec2(0.03, -0.05), vec2(0.0, -0.092)));
  over(g, 0.0, fillA(bub, e) * 0.93);
  over(g, 1.0, fillA(sdRR(bq, vec2(0.02 + 0.045 * v, 0.013), 0.013), e) * 0.96);
  return g;
}

float tabW(float j, float idx) { return 0.26 + 0.3 * fract(sin(j * 12.9 + idx * 4.1) * 43758.5); }

vec2 gTabs(vec2 p, float e, vec4 s) {
  vec2 g = vec2(0.0);
  float pos = s.x;
  float a0 = floor(clamp(pos, 0.0, 1.999)), a1 = a0 + 1.0, kc = clamp(pos - a0, 0.0, 1.0);
  vec2 tp = p - vec2(0.0, 0.17);
  over(g, 0.0, fillA(sdRR(tp, vec2(0.6, 0.105), 0.06), e) * 0.13);
  over(g, 1.0, fillA(sdRR(tp - vec2((pos - 1.0) * 0.39, 0.0), vec2(0.185, 0.078), 0.042), e) * 0.97);
  for (int i = 0; i < 3; i++) {
    float on = 1.0 - clamp(abs(pos - float(i)), 0.0, 1.0);
    float hov = 1.0 - step(0.5, abs(s.y - float(i)));
    over(g, 0.0, fillA(sdRR(tp - vec2((float(i) - 1.0) * 0.39, 0.0), vec2(0.085, 0.017), 0.017), e) * mix(mix(0.32, 0.6, hov), 0.93, on));
  }
  for (int j = 0; j < 3; j++) {
    float w = mix(tabW(float(j), a0), tabW(float(j), a1), kc);
    vec2 lp = p - vec2(-0.6 + w, -0.07 - float(j) * 0.1);
    over(g, 0.0, fillA(sdRR(lp, vec2(w, 0.022), 0.022), e) * 0.2);
  }
  return g;
}

vec2 gSkeleton(vec2 p, float e, vec4 s) {
  vec2 g = vec2(0.0);
  float d = length(p - vec2(-0.47, 0.17)) - 0.13;
  d = min(d, sdRR(p - vec2(0.1, 0.225), vec2(0.36, 0.034), 0.034));
  d = min(d, sdRR(p - vec2(-0.02, 0.115), vec2(0.24, 0.028), 0.028));
  d = min(d, sdRR(p - vec2(0.0, -0.16), vec2(0.6, 0.12), 0.05));
  float band = exp(-pow((p.x - p.y * 0.35 - s.x) / 0.2, 2.0));
  over(g, 0.0, fillA(d, e) * 0.17);
  over(g, 1.0, fillA(d, e) * band * 0.6);
  return g;
}

vec2 gOtp(vec2 p, float e, vec4 s, float t) {
  vec2 g = vec2(0.0);
  float filled = s.x, done = s.z;
  over(g, 0.0, fillA(sdRR(p, vec2(0.022, 0.006), 0.006), e) * 0.4);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float x = (fi - 2.5) * 0.19 + (i < 3 ? -0.05 : 0.05);
    vec2 q = p - vec2(x, 0.0);
    float box = sdRR(q, vec2(0.078, 0.105), 0.032);
    float act = (1.0 - done) * (1.0 - step(0.5, abs(fi - filled)));
    over(g, 1.0, fillA(box, e) * 0.5);
    over(g, 0.0, strokeA(box, 0.006, e) * mix(0.26, 0.95, max(act, done)));
    float has = step(fi + 0.5, filled);
    float pop = fi + 1.5 > filled ? s.y : 1.0;
    over(g, 0.0, fillA(length(q) - 0.03 * pop, e) * has * 0.93);
    over(g, 0.0, fillA(sdRR(q, vec2(0.005, 0.048), 0.005), e) * act * step(fract(t * 1.5), 0.55) * 0.9);
  }
  return g;
}

vec2 gToast(vec2 p, float e, vec4 st) {
  vec2 g = vec2(0.0);
  float s = st.x;
  for (int k = 3; k >= 0; k--) {
    float D = float(k) - 1.0 + s;
    float a = clamp(1.0 - D * 0.34, 0.0, 1.0) * clamp(1.0 + D * 1.6, 0.0, 1.0);
    float y = D < 0.0 ? -0.14 + D * 0.42 : -0.14 + D * 0.1;
    float sc = 1.0 - max(D, 0.0) * 0.075;
    vec2 q = (p - vec2(0.0, y)) / sc;
    float body = sdRR(q, vec2(0.54, 0.105), 0.05) * sc;
    over(g, 0.0, fillA(body - 0.012, e * 4.0) * a * 0.1);
    over(g, 1.0, fillA(body, e) * a * 0.97);
    over(g, 0.0, strokeA(body, 0.004, e) * a * 0.22);
    float front = a * clamp(1.0 - D * 0.9, 0.0, 1.0);
    over(g, 0.0, fillA((length(q - vec2(-0.41, 0.0)) - 0.045) * sc, e) * front * 0.93);
    over(g, 1.0, fillA(sdSeg(q, vec2(-0.431, 0.0), vec2(-0.415, -0.016)) * sc - 0.007, e) * front);
    over(g, 1.0, fillA(sdSeg(q, vec2(-0.415, -0.016), vec2(-0.388, 0.017)) * sc - 0.007, e) * front);
    over(g, 0.0, fillA(sdRR(q - vec2(-0.12, 0.03), vec2(0.19, 0.019), 0.019) * sc, e) * front * 0.9);
    over(g, 0.0, fillA(sdRR(q - vec2(-0.05, -0.036), vec2(0.26, 0.015), 0.015) * sc, e) * front * 0.3);
  }
  return g;
}

// The state of each component lives in JS, so a pointer can drive it.
vec2 glyph(int i, vec2 p, float e, float t) {
  vec4 s = uG[i];
  if (i == 0) return gSwitch(p, e, s);
  if (i == 1) return gButton(p, e, s, t);
  if (i == 2) return gSlider(p, e, s);
  if (i == 3) return gTabs(p, e, s);
  if (i == 4) return gSkeleton(p, e, s);
  if (i == 5) return gOtp(p, e, s, t);
  return gToast(p, e, s);
}

vec3 foilAt(float h) { return 0.80 + 0.20 * cos(TAU * (h - vec3(0.0, 0.3333, 0.6667))); }

void main() {
  vec2 uv = (gl_FragCoord.xy - uCenter) * 2.0 / uUnit;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCam * vec3(uv * uFov, 1.0));

  float T[N];
  vec4 C[N];

  for (int i = 0; i < N; i++) {
    float fi = float(i);
    vec3 lo = (ro - uC[i]) * uR[i];
    vec3 ld = rd * uR[i];
    float t = -lo.y / ld.y;
    vec3 p = lo + t * ld;
    vec3 p2 = lo + ((-THICK - lo.y) / ld.y) * ld;
    vec2 q = p.xz;
    float d = sdRR(q, HALF, RAD);
    float d2 = sdRR(p2.xz, HALF, RAD);
    float w = max(fwidth(d), 1e-5);
    vec2 qx = dFdx(q), qy = dFdy(q);
    float e = max(length(qx), length(qy)) * 1.2 + 1e-5;
    float top = fillA(d, w * 1.5);
    float bot = fillA(d2, w * 1.5);
    float cov = t > 0.0 ? max(top, bot) : 0.0;
    T[i] = t;
    C[i] = vec4(0.0);
    if (cov < 0.002) continue;

    float pres = uPres[i];
    float side = clamp(bot - top, 0.0, 1.0);
    float cosT = abs(ld.y);

    // Foil: a slow liquid pinwheel, shifted by the pointer and the viewing angle.
    vec2 wq = q + 0.16 * vec2(sin(q.y * 2.1 + uTime * 0.31 + fi * 1.3), cos(q.x * 1.7 - uTime * 0.27 + fi * 2.1));
    vec2 dv = wq - vec2(uPointer.x * 0.3, uPointer.y * 0.22);
    float h = atan(dv.y, dv.x) / TAU + fi * 0.061 + uTime * 0.04 + uPointer.x * 0.25 + (1.0 - cosT) * 0.5;
    vec3 foil = foilAt(h);
    foil = mix(vec3(0.95), foil, smoothstep(0.0, 0.6, length(dv)));

    vec3 col = mix(mix(vec3(1.0), foil, 0.6), foil, uDark);
    float a = mix(mix(0.8, 0.44, uDark), mix(0.95, 0.9, uDark), pres);

    // Soft key light that follows the pointer.
    vec2 hp = q - mix(vec2(uPointer.x * 0.6, -0.25 + uPointer.y * 0.45), vec2(uHover.x, -uHover.y), uHover.z * pres);
    float hl = exp(-dot(hp, hp) / mix(0.55, 0.34, uHover.z * pres)) * (1.0 + 0.2 * uHover.z * pres);
    col = mix(col, vec3(1.0), hl * mix(0.3, 0.16, uDark));

    // Glass edge.
    float rim = exp(-pow(d / (w * 2.2), 2.0)) * top;
    col = mix(col, mix(col * 0.9, vec3(1.0), uDark), rim * mix(0.7, 0.5, uDark));
    col = mix(col, mix(foil * 0.82, foil * 1.12, uDark), side);
    a = mix(a, 0.95, side);

    if (pres > 0.01) {
      vec2 gq = vec2(q.x, -q.y);
      vec2 g = glyph(i, gq, e, uTime);
      col = mix(col, vec3(1.0), 0.1 * pres * uDark);
      col = mix(col, mix(INK, vec3(1.0), g.x), g.y * pres);
      a = mix(a, 1.0, g.y * pres);
      // Name and library on top, install command at the bottom.
      const float LW = 1.76, LH = LW / 16.0;
      float u = (gq.x + LW * 0.5) / LW;
      for (int r = 0; r < 2; r++) {
        float yc = r == 0 ? 0.6 : -0.6;
        float v = (yc + LH * 0.5 - gq.y) / LH;
        if (u > 0.0 && u < 1.0 && v > 0.0 && v < 1.0) {
          float rows = float(N * 2);
          vec2 tuv = vec2(u, (fi * 2.0 + float(r) + v) / rows);
          vec2 sc = vec2(1.0 / LW, -1.0 / (LH * rows));
          float ink = textureGrad(uLabels, tuv, vec2(qx.x, -qx.y) * sc, vec2(qy.x, -qy.y) * sc).r;
          col = mix(col, INK, ink * pres);
        }
      }
    }

    vec3 rgb = col * a;
    // Mirror glint, and one sweep of light when a sheet is handed over.
    vec3 rr = reflect(ld, vec3(0.0, sign(-ld.y), 0.0));
    float spec = pow(max(dot(rr, uLight * uR[i]), 0.0), 18.0);
    float sweep = exp(-pow((q.x * 0.8 - q.y * 0.6 - uGlint) / 0.13, 2.0)) * pres;
    float add = spec * 0.22 + sweep * mix(0.24, 0.2, uDark);
    rgb += add * mix(vec3(1.0), foil, 0.3);
    a = min(a + add * 0.5, 1.0);
    C[i] = vec4(min(rgb, vec3(1.0)) * cov, a * cov) ;
  }

  // Composite front to back, nearest hit first.
  vec4 acc = vec4(0.0);
  float last = -1e9;
  for (int k = 0; k < N; k++) {
    float best = 1e9;
    vec4 c = vec4(0.0);
    for (int j = 0; j < N; j++) {
      if (T[j] > last && T[j] < best) { best = T[j]; c = C[j]; }
    }
    last = best;
    acc += (1.0 - acc.a) * c;
  }

  // Floor: a soft shadow by day, the light that falls through the stack by night.
  float tf = (uFloorY - ro.y) / rd.y;
  if (tf > 0.0 && acc.a < 0.985) {
    vec3 f = ro + tf * rd;
    float occ = 0.0;
    vec3 tint = vec3(0.0);
    for (int i = 0; i < N; i++) {
      vec3 lf = (f - uC[i]) * uR[i];
      float hgt = max(uC[i].y - uFloorY, 0.0);
      float b = 0.22 + 0.5 * hgt;
      float s = 1.0 - smoothstep(-b, b, sdRR(lf.xz, HALF, RAD));
      s *= 1.0 / (1.0 + hgt * 0.7);
      occ = 1.0 - (1.0 - occ) * (1.0 - 0.3 * s);
      tint += foilAt(float(i) * 0.14 + uTime * 0.04 + lf.x * 0.2) * s;
    }
    tint /= float(N);
    vec4 night = vec4(mix(vec3(0.66, 0.59, 1.0), tint * 2.2, 0.55) * occ * 0.2, 0.0);
    vec4 day = vec4(mix(vec3(0.0), tint, 0.5) * occ * 0.16, occ * 0.16);
    acc += (1.0 - acc.a) * mix(day, night, uDark);
  }

  acc *= uIntro;
  acc.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * acc.a;
  outColor = acc;
}`;
