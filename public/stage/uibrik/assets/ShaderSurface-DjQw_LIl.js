import{i as e,o as t,t as n}from"./index-TChZs6Gr.js";import{t as r}from"./utils-C2msa8mM.js";var i=t(e(),1),a=n();function o(e){let t=new MutationObserver(e);return t.observe(document.documentElement,{attributes:!0,attributeFilter:[`class`]}),()=>t.disconnect()}var s=()=>document.documentElement.classList.contains(`dark`);function c(){return(0,i.useSyncExternalStore)(o,s,()=>!1)}var l=`#version 300 es
// one triangle that covers the whole canvas, no buffers needed
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,u=`
// 3D simplex noise by Ian McEwan, Ashima Arts, and Stefan Gustavson.
// Copyright (C) 2011 Ashima Arts. Copyright (C) 2011-2016 Stefan Gustavson.
// Distributed under the MIT License: https://github.com/stegu/webgl-noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`,d=`#version 300 es
precision highp float;

uniform vec2 u_res;        // canvas size, device px
uniform float u_dpr;       // device px per css px
uniform float u_time;      // animation clock, seconds (already scaled by speed)
uniform float u_age;       // seconds of motion played since the surface first showed; large when still
uniform vec2 u_pointer;    // pointer position, device px, y up
uniform float u_pointerAmt; // 0..1, eased: how present the pointer is
uniform vec2 u_trail;      // a lazier point following u_pointer, device px, y up
uniform vec3 u_colors[6];  // palette, OKLab
uniform int u_count;       // palette size
uniform vec3 u_bg;         // page background, OKLab
uniform float u_dark;      // 0 light .. 1 dark, eased during a theme change
uniform float u_grain;     // film grain strength
uniform float u_grainSize; // grain speck size, device px
const int RIPPLE_COUNT = 8; // click rings alive at once (must match RIPPLES below)
uniform vec3 u_ripples[RIPPLE_COUNT]; // click rings: position (device px, y up) and age (seconds)
uniform vec3 u_trailPts[16]; // the pointer's recent path, newest first: position and strength 0..1
uniform int u_trailCount;

out vec4 outColor;

// "Hash without Sine", Copyright (c) 2014 David Hoskins. MIT License:
// https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

${u}
vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// rings sent out by clicks: 1 on a ring's crest, fading as it travels outward
float ripples(vec2 frag) {
  float sum = 0.0;
  for (int i = 0; i < RIPPLE_COUNT; i++) {
    vec3 r = u_ripples[i];
    if (r.z < 0.0 || r.z > 3.0) continue;
    float d = length(frag - r.xy) - r.z * 460.0 * u_dpr;
    float w = 34.0 * u_dpr;
    float life = 1.0 - r.z / 3.0;
    sum += exp(-d * d / (w * w)) * life * life;
  }
  return sum;
}

// distance from p to the segment between the trail and the pointer: a light shaped like a soft
// comet while the pointer moves, and a plain circle once it rests
float pointerDist(vec2 p, float trail) {
  vec2 a = u_pointer;
  vec2 b = mix(u_pointer, u_trail, trail);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * h);
}

// the pointer's recent path as a soft stroke: 1 near the newest points, tapering (in width and
// strength) toward the oldest. Each segment between path points is a capsule.
float trailField(vec2 p, float radius) {
  float best = 0.0;
  for (int i = 0; i < 15; i++) {
    if (i + 1 >= u_trailCount) break;
    vec3 a = u_trailPts[i];
    vec3 b = u_trailPts[i + 1];
    vec2 ab = b.xy - a.xy;
    float h = clamp(dot(p - a.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float s = mix(a.z, b.z, h);
    float r = radius * (0.35 + 0.65 * s);
    float d = length(p - a.xy - ab * h);
    best = max(best, exp(-d * d / (r * r)) * s);
  }
  if (u_trailCount == 1) {
    float d = length(p - u_trailPts[0].xy);
    best = exp(-d * d / (radius * radius)) * u_trailPts[0].z;
  }
  return best;
}

// mixes two OKLab colours in OKLCH: lightness and chroma blend straight, hue goes the short way
// round, so the middle of a mix stays as vivid as its ends instead of passing through grey
vec3 mixLch(vec3 a, vec3 b, float t) {
  float ca = length(a.yz);
  float cb = length(b.yz);
  float ha = atan(a.z, a.y);
  float hb = atan(b.z, b.y);
  // a near-grey has no real hue of its own: borrow the other colour's
  if (ca < 0.02) ha = hb;
  if (cb < 0.02) hb = ha;
  float dh = mod(hb - ha + 3.14159265, 6.2831853) - 3.14159265;
  float h = ha + dh * t;
  float c = mix(ca, cb, t);
  return vec3(mix(a.x, b.x, t), c * cos(h), c * sin(h));
}

// palette as a ramp, blended in OKLCH: 0 is the first colour, 1 the last
vec3 paletteRampLch(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  return mixLch(u_colors[i], u_colors[i + 1], smoothstep(0.0, 1.0, f - float(i)));
}

// palette as a loop: 0..1 runs through every colour and back to the first
vec3 paletteLoop(float x) {
  float f = fract(x) * float(u_count);
  int i = int(floor(f));
  int j = i + 1 >= u_count ? 0 : i + 1;
  return mix(u_colors[i], u_colors[j], smoothstep(0.0, 1.0, fract(f)));
}

// palette as a ramp: 0 is the first colour, 1 the last
vec3 paletteRamp(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  return mix(u_colors[i], u_colors[i + 1], smoothstep(0.0, 1.0, f - float(i)));
}
`,f=`
void main() {
  vec3 c = linearToSrgb(shade(gl_FragCoord.xy));
  // grain, plus a touch of per-pixel dither so slow gradients never band
  c += (hash12(floor(gl_FragCoord.xy / u_grainSize)) - 0.5) * u_grain;
  c += (hash12(gl_FragCoord.xy + 17.0) - 0.5) * (1.5 / 255.0);
  outColor = vec4(c, 1.0);
}
`,p=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,m=e=>{let t=e.trim().replace(/^#/,``);t.length===3&&(t=[...t].map(e=>e+e).join(``));let n=parseInt(t.slice(0,6),16);return Number.isNaN(n)?[.5,.5,.5]:[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};function h(e){let[t,n,r]=m(e).map(p),i=Math.cbrt(.4122214708*t+.5363325363*n+.0514459929*r),a=Math.cbrt(.2119034982*t+.6806995451*n+.1073969566*r),o=Math.cbrt(.0883024619*t+.2817188376*n+.6299787005*r);return[.2104542553*i+.793617785*a-.0040720468*o,1.9779984951*i-2.428592205*a+.4505937099*o,.0259040371*i+.7827717662*a-.808675766*o]}function g(e,t=.5){let n=`#version 300 es
precision highp float;
uniform vec2 u_res;       // full canvas size, device px
uniform vec2 u_texRes;    // this texture's size
uniform float u_dpr;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_pointerAmt;
out vec4 outColor;

// "Hash without Sine", Copyright (c) 2014 David Hoskins. MIT License:
// https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
${u}
${e}

void main() {
  vec2 frag = gl_FragCoord.xy / u_texRes * u_res;
  // stored at a quarter, so an 8-bit target still holds up to 4x
  outColor = vec4(vec3(max(source(frag), 0.0) * 0.25), 1.0);
}
`;return e=>{let r=x(e,l,n);if(!r)return null;let i=!!e.getExtension(`EXT_color_buffer_float`),a=e.createTexture(),o=e.createFramebuffer(),s=0,c=0,u=new Map,d=t=>(u.has(t)||u.set(t,e.getUniformLocation(r,t)),u.get(t));return{render(e,n){let l=Math.max(1,Math.round(n.width*t)),u=Math.max(1,Math.round(n.height*t));(l!==s||u!==c)&&(s=l,c=u,e.bindTexture(e.TEXTURE_2D,a),i?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,l,u,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,l,u,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,o),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a,0)),e.bindFramebuffer(e.FRAMEBUFFER,o),e.viewport(0,0,l,u),e.useProgram(r),e.uniform2f(d(`u_res`),n.width,n.height),e.uniform2f(d(`u_texRes`),l,u),e.uniform1f(d(`u_dpr`),n.dpr),e.uniform1f(d(`u_time`),n.time),e.uniform2f(d(`u_pointer`),n.pointer[0],n.pointer[1]),e.uniform1f(d(`u_pointerAmt`),n.pointerAmt);for(let[t,r]of Object.entries(n.uniforms))e.uniform1f(d(t),r);return e.drawArrays(e.TRIANGLES,0,3),e.bindTexture(e.TEXTURE_2D,a),e.generateMipmap(e.TEXTURE_2D),a},dispose(e){e.deleteProgram(r),e.deleteTexture(a),e.deleteFramebuffer(o)}}}}var _={light:h(`#ffffff`),dark:h(`#0a0a0a`)},v=6,ee=8,te=3,ne=16,y=[1,.75,.5],re=1/48,ie=.75;function b(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)&&!e.isContextLost()?(console.error(e.getShaderInfoLog(r)),e.deleteShader(r),null):r}function x(e,t,n){let r=b(e,e.VERTEX_SHADER,t),i=b(e,e.FRAGMENT_SHADER,n);if(!r||!i)return null;let a=e.createProgram();return e.attachShader(a,r),e.attachShader(a,i),e.linkProgram(a),e.deleteShader(r),e.deleteShader(i),!e.getProgramParameter(a,e.LINK_STATUS)&&!e.isContextLost()?(console.error(e.getProgramInfoLog(a)),null):a}function S(e,t,n,r){let i=e.getExtension(`KHR_parallel_shader_compile`);if(!i)return Promise.resolve(x(e,t,n));let a=[[e.VERTEX_SHADER,t],[e.FRAGMENT_SHADER,n]].map(([t,n])=>{let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}),o=e.createProgram();for(let t of a)e.attachShader(o,t);return e.linkProgram(o),new Promise(t=>{let n=n=>{if(!n&&!e.isContextLost()){for(let t of a){let n=e.getShaderInfoLog(t);n&&console.error(n)}console.error(e.getProgramInfoLog(o))}for(let t of a)e.deleteShader(t);n||e.deleteProgram(o),t(n?o:null)},s=()=>{if(r?.()||e.isContextLost())return n(!1);e.getProgramParameter(o,i.COMPLETION_STATUS_KHR)?n(!!e.getProgramParameter(o,e.LINK_STATUS)):requestAnimationFrame(s)};s()})}var C=e=>h(e)[0]<.6,ae=e=>{let t=e.filter(Boolean).slice(0,v);t.length===0&&t.push(`#808080`),t.length===1&&t.push(t[0]);let n=new Float32Array(18);return t.forEach((e,t)=>n.set(h(e),t*3)),{data:n,count:t.length}};function w({shader:e,uniforms:t,vectors:n,colors:o,speed:s,animate:u,interactive:p,grain:m,grainSize:g=1,seed:v=0,background:b=``,backgroundDark:w=``,ripples:T=!1,follow:E=.6,trailLife:D=.9,prepass:O,plainShader:k,maxDpr:A=1.5,maxFps:j=60,fallback:M,className:N,style:P,children:F}){let I=(0,i.useRef)(null),L=c(),[R,z]=(0,i.useState)(!1),B={uniforms:t,vectors:n,speed:s,animate:u,interactive:p,grain:m,grainSize:g,seed:v,background:b,backgroundDark:w,ripples:T,follow:E,trailLife:D,prepass:O,maxDpr:A,maxFps:j,dark:L,colorKey:o.join(`,`)},V=(0,i.useRef)(B),H=(0,i.useRef)(()=>{});(0,i.useEffect)(()=>{V.current=B,H.current()}),(0,i.useEffect)(()=>{let t=I.current;if(!t)return;let n=()=>{let n=document.createElement(`canvas`);n.setAttribute(`aria-hidden`,`true`),n.className=`pointer-events-none absolute inset-0 -z-10 size-full`;let r=n.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`});if(!r){z(!0);return}let i=r,a=t,o=null,s=null,c=new Map,u=e=>(c.has(e)||c.set(e,i.getUniformLocation(o,e)),c.get(e)),p=()=>(s=V.current.prepass?.(i)??null,o=x(i,l,d+(!s&&k?k:e)+f),c=new Map,o&&i.useProgram(o),!!o),m=!1,g;return(async()=>(s=V.current.prepass?.(i)??null,o=await S(i,l,d+(!s&&k?k:e)+f,()=>m),c=new Map,o&&i.useProgram(o),!!o))().then(e=>{m||(e?g=v():z(!0))}),()=>{m=!0,g?g():(s?.dispose(i),i.getExtension(`WEBGL_lose_context`)?.loseContext())};function v(){a.prepend(n);let e=window.matchMedia(`(prefers-reduced-motion: reduce)`),t=1,r=1,c=0,l=y[0],d=!0,f=!1,m=0,g=0,v=0,b=12,x=0,S=()=>document.documentElement.classList.contains(`dark`),w=()=>V.current.background&&!V.current.backgroundDark?C(V.current.background):S(),T=+!!w(),E={key:``,data:new Float32Array(18),count:2},D={x:0,y:0,lx:0,ly:0,tx:0,ty:0,amt:0,inside:!1,seen:!1},O=Array.from({length:ee},()=>({x:0,y:0,start:-1/0})),k=new Float32Array(24),A=[],j=new Float32Array(48),M=`-`,N=_.light,P=_.dark,F=0,I=0,L=()=>{let e=a.getBoundingClientRect();t=Math.max(1,e.width),r=Math.max(1,e.height);let i=Math.min(window.devicePixelRatio||1,V.current.maxDpr)*l,o=Math.max(1,Math.round(t*i)),s=Math.max(1,Math.round(r*i));(n.width!==o||n.height!==s)&&(n.width=o,n.height=s)},R=()=>{if(f||!o)return;let r=V.current;E.key!==r.colorKey&&(E={key:r.colorKey,...ae(r.colorKey.split(`,`))});let a=n.width/t;M!==r.background+r.backgroundDark&&(M=r.background+r.backgroundDark,N=r.background?h(r.background):_.light,P=r.background?h(r.backgroundDark||r.background):_.dark);let c=N.map((e,t)=>e+(P[t]-e)*T),l=performance.now()/1e3;O.forEach((e,t)=>k.set([e.x*a,e.y*a,l-e.start],t*3)),j.fill(0),A.forEach((e,t)=>{let n=Math.min(1,(l-e.t)/r.trailLife);j.set([e.x*a,e.y*a,1-n*n*(3-2*n)],t*3)});let d=null;s&&(d=s.render(i,{width:n.width,height:n.height,dpr:a,time:b+r.seed*37.1,pointer:[D.x*a,D.y*a],pointerAmt:D.amt,ripples:k,uniforms:r.uniforms??{}}),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindVertexArray(null),i.disable(i.BLEND),i.colorMask(!0,!0,!0,!0),i.useProgram(o)),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,d),i.uniform1i(u(`u_tex`),0),i.viewport(0,0,n.width,n.height),i.uniform2f(u(`u_res`),n.width,n.height),i.uniform1f(u(`u_dpr`),a),i.uniform1f(u(`u_time`),b+r.seed*37.1),i.uniform1f(u(`u_age`),r.animate&&r.speed>0&&!e.matches?x:1e4),i.uniform2f(u(`u_pointer`),D.x*a,D.y*a),i.uniform2f(u(`u_trail`),D.lx*a,D.ly*a),i.uniform1f(u(`u_pointerAmt`),D.amt),i.uniform3fv(u(`u_colors`),E.data),i.uniform1i(u(`u_count`),E.count),i.uniform3f(u(`u_bg`),c[0],c[1],c[2]),i.uniform1f(u(`u_dark`),T),i.uniform1f(u(`u_grain`),r.grain),i.uniform1f(u(`u_grainSize`),Math.max(1,r.grainSize*a)),i.uniform3fv(u(`u_ripples`),k),i.uniform3fv(u(`u_trailPts`),j),i.uniform1i(u(`u_trailCount`),A.length);for(let[e,t]of Object.entries(r.uniforms??{}))i.uniform1f(u(e),t);for(let[e,[t,n,a]]of Object.entries(r.vectors??{}))i.uniform3f(u(e),t,n,a);i.drawArrays(i.TRIANGLES,0,3)},B=()=>d&&!document.hidden&&!f,U=()=>{!m&&B()&&(m=requestAnimationFrame(G))},W=(e,t,n,r,i)=>{let a=e+(t-e)*(1-Math.exp(-n*r));return Math.abs(t-a)<i?t:a};function G(t){m=0;let n=1e3/V.current.maxFps;if(g&&t<v-2){m=requestAnimationFrame(G);return}v=g&&t-v<n?v+n:t+n;let r=g?Math.min((t-g)/1e3,.1):0;g=t;let i=V.current,a=e.matches,o=i.animate&&i.speed>0&&!a;o&&(b+=r*i.speed,x+=r);let s=+!!w(),u=document.documentElement.hasAttribute(`data-theme-reveal`);T=a||u?s:W(T,s,7,r,.002);let d=i.interactive&&!a&&D.inside?1:0;D.amt=W(D.amt,d,3.5,r,.002);let f=28*(1/9)**Math.min(1,Math.max(0,i.follow));D.x=W(D.x,D.tx,f,r,.1),D.y=W(D.y,D.ty,f,r,.1),D.lx=W(D.lx,D.x,f*.35,r,.1),D.ly=W(D.ly,D.y,f*.35,r,.1);let p=t/1e3;for(;A.length&&p-A[A.length-1].t>i.trailLife;)A.pop();if(D.amt>0&&i.interactive&&!a){let e=A[0];(!e||Math.hypot(e.x-D.x,e.y-D.y)>6)&&(A.unshift({x:D.x,y:D.y,t:p}),A.length>ne&&A.pop())}R(),o&&r>0&&x>ie&&c<y.length-1&&(F+=r,I++,F>=1&&(F/I>Math.max(re,1.25/V.current.maxFps)&&(l=y[++c],L()),F=0,I=0));let h=O.some(e=>t/1e3-e.start<te)||A.length>0||T!==s||D.amt!==d||D.amt>0&&(D.x!==D.tx||D.y!==D.ty||D.lx!==D.x||D.ly!==D.y);o||h?U():g=0}H.current=()=>{L(),!m&&B()&&(g=0,m=requestAnimationFrame(G))};let K=e=>{let t=a.getBoundingClientRect();D.tx=e.clientX-t.left,D.ty=t.bottom-e.clientY,D.inside=e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom,D.seen&&D.amt!==0||(D.x=D.lx=D.tx,D.y=D.ly=D.ty,D.seen=!0),V.current.interactive&&U()},q=t=>{if(K(t),!V.current.ripples||!V.current.interactive||!D.inside||e.matches)return;let n=O.reduce((e,t)=>t.start<e.start?t:e);Object.assign(n,{x:D.tx,y:D.ty,start:performance.now()/1e3}),U()},J=()=>{D.inside=!1,U()},Y=()=>{g=0,U()},X=new ResizeObserver(()=>{L(),R(),U()});X.observe(a);let Z=new IntersectionObserver(([e])=>{d=e.isIntersecting,g=0,U()});Z.observe(a);let Q=e=>{e.preventDefault(),f=!0,cancelAnimationFrame(m),m=0},$=()=>{f=!1,p()?U():(n.remove(),z(!0))};window.addEventListener(`pointermove`,K,{passive:!0}),window.addEventListener(`pointerdown`,q,{passive:!0}),document.documentElement.addEventListener(`pointerleave`,J),window.addEventListener(`blur`,J),document.addEventListener(`visibilitychange`,Y),e.addEventListener(`change`,Y),n.addEventListener(`webglcontextlost`,Q),n.addEventListener(`webglcontextrestored`,$);let oe=a.getBoundingClientRect(),se=!e.matches&&oe.bottom>0&&oe.top<innerHeight&&(a.checkVisibility?.({opacityProperty:!0,visibilityProperty:!0})??!1);return se&&(n.style.opacity=`0`,n.style.transition=`opacity 500ms ease-out`),L(),R(),se&&requestAnimationFrame(()=>n.style.opacity=`1`),U(),()=>{cancelAnimationFrame(m),H.current=()=>{},X.disconnect(),Z.disconnect(),window.removeEventListener(`pointermove`,K),window.removeEventListener(`pointerdown`,q),document.documentElement.removeEventListener(`pointerleave`,J),window.removeEventListener(`blur`,J),document.removeEventListener(`visibilitychange`,Y),e.removeEventListener(`change`,Y),n.removeEventListener(`webglcontextlost`,Q),n.removeEventListener(`webglcontextrestored`,$),s?.dispose(i),i.getExtension(`WEBGL_lose_context`)?.loseContext(),n.remove()}}},r=!1,i=0,a,o=`requestIdleCallback`in window,s=()=>{r||(a=n())},c=new IntersectionObserver(([e])=>{e.isIntersecting&&(c.disconnect(),i=o?requestIdleCallback(s,{timeout:1e3}):window.setTimeout(s,1))},{rootMargin:`50% 0px`});return c.observe(t),()=>{r=!0,c.disconnect(),o?cancelIdleCallback(i):clearTimeout(i),a?.()}},[e,k]);let U=b||`#ffffff`,W=w||b||`#0a0a0a`,G=M(C(U),U),K=M(C(W),W);return(0,a.jsx)(`div`,{ref:I,className:r(`relative isolate overflow-hidden [background:var(--shader-fallback)] dark:[background:var(--shader-fallback-dark)]`,N),"data-fallback":R||void 0,style:{"--shader-fallback":G,"--shader-fallback-dark":K,...P},children:F})}export{h as a,x as i,w as n,g as o,l as r,u as t};