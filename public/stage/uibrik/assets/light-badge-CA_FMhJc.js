import{i as e,o as t,t as n}from"./index-TChZs6Gr.js";var r=t(e(),1),i=`#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,a=`#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uSize;      // pill size, css px
uniform float uPad;      // canvas margin around the pill (room for the rays), css px
uniform float uRadius;   // corner radius, css px
uniform float uStroke;   // stroke width, css px
uniform float uRay;      // light-ray strength under the pill, 0 = off
uniform float uRayLen;   // how far the rays fall, css px
uniform float uAngle;    // gradient rotation, radians
uniform float uTime;     // animation time, seconds (runs faster while hovered)
uniform float uSweep;    // where the light sits along the bottom, -1 (left) .. 1 (right)
uniform float uHover;    // 0..1, eased: brightens the light while the pointer is over the badge
uniform float uIntro;    // 0..1, eased: the entrance, everything rising together like a sunrise
uniform int uWaves;      // how many inner waves (fewer on slow devices), up to 7
uniform vec3 uFill;      // pill fill colour (sRGB)
uniform vec3 uBorder;    // plain hairline round the rest of the pill (sRGB)
uniform vec3 uLab[6];    // gradient stops in OKLab, cyclic
uniform float uInner;    // strength of the inner waves, 0 = off
uniform float uOnLight;  // 1 on a light page: light shows as colour, not white glow
uniform int uMode;       // 0 = the badge, 1 = the light it casts onto content below
uniform vec4 uRegion;    // mode 1: area drawn, pill-centred css px (y up): x min, y min, width, height
uniform float uCast;     // mode 1: strength of the cast light
uniform float uCastLen;  // mode 1: how far the cast light reaches, css px

const float TAU = 6.28318530718;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 oklabToSrgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  vec3 lin = clamp(vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
  return mix(12.92 * lin, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

// cyclic palette, blended in OKLab: t in [0,1) walks the six stops and wraps back to the first
vec3 palette(float t) {
  float x = fract(t) * 6.0;
  int i = int(floor(x));
  float f = smoothstep(0.0, 1.0, fract(x));
  return oklabToSrgb(mix(uLab[i], uLab[(i + 1) % 6], f));
}

// the stroke's colour at a point on (or near) the outline
vec3 strokeColor(vec2 p) {
  vec2 q = p / (uSize * 0.5); // normalised to a circle so colour spreads evenly round the pill
  return palette((atan(q.y, q.x) - uAngle) / TAU);
}

// where the light is brightest along the bottom, clear of the rounded ends
float lightX() { return uSweep * (uSize.x * 0.5 - uRadius * 1.4); }

// how far the hottest light turns white. White light can't show on a white page, so on a light page
// the hot spot stays mostly colour (the light reads as tinted, like coloured light on paper)
float glowWhite() { return 1.0 - 0.8 * uOnLight; }

// the light the badge casts onto whatever sits below it (mode 1): the same rays, continued further,
// white where the light is hot and coloured as it travels, fading with distance
vec4 castLight(vec2 p, float sun, float boost) {
  float flat_ = uSize.x * 0.5 - uRadius;
  float belowLine = max(-p.y - uSize.y * 0.5, 0.0);
  if (belowLine <= 0.0) return vec4(0.0);
  float x0 = p.x / (1.0 + belowLine * 0.03);
  float ends = 1.0 - smoothstep(flat_ * 0.55, flat_ + uRadius * 0.7071, abs(x0));
  float hot0 = exp(-pow((x0 - lightX()) / (uSize.x * 0.24), 2.0));
  vec3 c = mix(strokeColor(vec2(x0, -uSize.y * 0.5)), vec3(1.0), 0.35 * hot0 * glowWhite());
  float fall = exp(-belowLine / uCastLen);
  float streaks = 0.62 + 0.38 * sin(x0 * 0.24 + 1.4 * sin(x0 * 0.05 + uTime * 0.5));
  float a = clamp(uCast * boost * sun * fall * ends * streaks * (0.55 + 0.45 * hot0), 0.0, 1.0);
  return vec4(c * a, a); // premultiplied
}

void main() {
  // entrance: like a sunrise, the whole light (stroke, waves, rays, cast light) rises from nothing
  // to full intensity at once; the waves also grow up from the edge as it brightens
  float sun = uIntro;
  float boost = 1.0 + 0.4 * uHover;
  if (uMode == 1) {
    vec2 q = uRegion.xy + vUv * uRegion.zw;
    vec4 l = castLight(q, sun, boost);
    outColor = l;
    return;
  }
  vec2 full = uSize + 2.0 * uPad;
  vec2 p = (vUv - 0.5) * full;               // css px, centred on the pill (y up)
  float d = sdRoundBox(p, uSize * 0.5, uRadius);
  float aa = fwidth(d);                      // one device pixel, in css px

  vec3 col = strokeColor(p);
  float inside = 1.0 - smoothstep(-aa, aa, d);                       // the pill
  float band = inside * smoothstep(-uStroke - aa, -uStroke + aa, d); // stroke: the outer uStroke px
  vec3 rgb = uFill;

  float fromBottom = p.y + uSize.y * 0.5;    // 0 at the bottom edge
  float spread = exp(-pow((p.x - lightX()) / (uSize.x * 0.24), 2.0)); // bell round the hot spot
  float n1 = noise(vec2(p.x * 0.03 + uTime * 0.35, uTime * 0.25));
  float n2 = noise(vec2(p.x * 0.07 - uTime * 0.5, 4.0 + uTime * 0.3));
  float breathe = 0.6 + 0.4 * (0.6 * n1 + 0.4 * n2);

  // inner waves: soft domes rising from the edge, each with its own colour, width and rhythm. The
  // row travels side to side with the light; waves sit on a loop a little wider than the pill, so
  // one leaving an end is already re-entering from the other, out of sight
  vec3 waveSum = vec3(0.0);
  float waveW = 0.0;
  float nW = float(uWaves);
  float loopW = uSize.x * 1.2;
  for (int i = 0; i < 7; i++) {
    if (i >= uWaves) break;
    float fi = float(i);
    float xi = (fi / nW - 0.5) * loopW + uSweep * uSize.x * 0.45
             + sin(uTime * (0.32 + 0.07 * fi) + fi * 1.7) * uSize.x * 0.03;
    xi = mod(xi + loopW * 0.5, loopW) - loopW * 0.5;
    // fewer waves (slow devices) are wider, so the row still covers the bottom
    float wi = uSize.x * (0.085 + 0.04 * hash(vec2(fi, 3.1))) * (7.0 / nW);
    float hi = uSize.y * (0.28 + 0.3 * (0.5 + 0.5 * sin(uTime * (0.55 + 0.11 * fi) + fi * 2.3)));
    hi *= 0.35 + 0.65 * sun;                // waves rise as the light comes up
    vec2 dv = vec2((p.x - xi) / wi, fromBottom / hi);
    float e = exp(-dot(dv, dv) * 1.3);
    waveSum += palette(fi / nW + uTime * 0.03) * e;
    waveW += e;
  }
  vec3 waveCol = waveSum / max(waveW, 1e-4);
  float core = exp(-fromBottom / 1.6);      // thin white core hugging the edge
  vec3 glowCol = mix(waveCol, vec3(1.0), clamp(core / (core + waveW * 0.6 + 1e-4), 0.0, 1.0) * 0.6 * glowWhite());
  float base = 0.18 * exp(-fromBottom / (uSize.y * 0.22));
  float amount = uInner * (1.0 + 0.35 * uOnLight) * boost * sun *
    ((min(waveW, 1.2) + base) * (0.55 + 0.6 * spread) * breathe + core * 0.9 * spread);
  amount = clamp(amount, 0.0, 1.0) * inside;
  rgb = mix(rgb, glowCol, amount);

  // stroke: gradient on the bottom only, fading out round the curved ends; plain hairline elsewhere.
  // Where the light is brightest it runs white-hot
  float rise = fromBottom / uRadius;
  float bottomOnly = (1.0 - smoothstep(0.08, 0.95, rise)) * sun;
  vec3 hot = mix(col, vec3(1.0), clamp(0.4 * spread * boost, 0.0, 1.0) * glowWhite());
  rgb = mix(rgb, mix(uBorder, hot, bottomOnly), band);

  // rays: each starts on the bottom outline and fans outward as it falls (measured from its origin,
  // so there is no seam where the curve turns steep); white at the start, coloured as it falls
  float ray = 0.0;
  vec3 rayCol = vec3(0.0);
  float flat_ = uSize.x * 0.5 - uRadius;
  float belowLine = max(-p.y - uSize.y * 0.5, 0.0);
  float x0 = p.x / (1.0 + belowLine * 0.03);
  float ax0 = min(max(abs(x0) - flat_, 0.0), uRadius * 0.75);
  float edgeY0 = -(uSize.y * 0.5 - uRadius) - sqrt(uRadius * uRadius - ax0 * ax0);
  float below = edgeY0 - p.y;
  if (below > 0.0) {
    float hot0 = exp(-pow((x0 - lightX()) / (uSize.x * 0.24), 2.0));
    rayCol = mix(strokeColor(vec2(x0, edgeY0)), vec3(1.0), 0.45 * hot0 * exp(-below / 4.0) * glowWhite());
    float fall = exp(-below / uRayLen) * smoothstep(0.0, 1.5, below);
    float ends = 1.0 - smoothstep(flat_ * 0.55, flat_ + uRadius * 0.7071, abs(x0));
    float streaks = 0.74 + 0.26 * sin(x0 * 0.24 + 1.4 * sin(x0 * 0.05 + uTime * 0.5));
    vec2 halfFull = full * 0.5;
    float edgeFade = (1.0 - smoothstep(halfFull.x - uPad * 0.9, halfFull.x - 1.0, abs(p.x)))
                   * (1.0 - smoothstep(halfFull.y - uPad * 0.7, halfFull.y - 1.0, -p.y));
    ray = uRay * (1.0 + 0.5 * uOnLight) * boost * fall * ends * streaks * edgeFade * sun * (1.0 - inside);
    ray = clamp(ray, 0.0, 1.0);
  }

  // premultiplied: the pill, then the rays beneath it
  outColor = vec4(rgb * inside + rayCol * ray, inside + ray);
}`,o=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,s=e=>{let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},c=e=>{let[t,n,r]=s(e).map(o),i=Math.cbrt(.4122214708*t+.5363325363*n+.0514459929*r),a=Math.cbrt(.2119034982*t+.6806995451*n+.1073969566*r),c=Math.cbrt(.0883024619*t+.2817188376*n+.6299787005*r);return[.2104542553*i+.793617785*a-.0040720468*c,1.9779984951*i-2.428592205*a+.4505937099*c,.0259040371*i+.7827717662*a-.808675766*c]},l=e=>new Float32Array(e.slice(0,6).flatMap(e=>{let[t,n,r]=c(e);return[t-.1,n*1.35,r*1.35]})),u=e=>new Float32Array(e.slice(0,6).flatMap(c)),d=e=>-(Math.cos(Math.PI*e)-1)/2,f=e=>{let t=Math.min(1,Math.max(0,e));return t*t*t*(t*(t*6-15)+10)},p=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r)),m=2.4,h=1e3/60,g=.8,_=(e,t,n)=>{let r=f((n-t)/g);if(r>=1)return e.to;let i=new Float32Array(e.to.length);for(let t=0;t<i.length;t++)i[t]=e.from[t]+(e.to[t]-e.from[t])*r;return i},v=class e{canvas;gl;prog=null;loc={};items=new Set;raf=0;last=0;due=0;lost=!1;pointer=null;reduceMotion=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;fontsVersion=0;lowQuality=!1;sampleSum=0;samples=0;io;ro;mo;constructor(e,t){this.canvas=e,this.gl=t,this.init(),this.canvas.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),this.lost=!0,this.stop()}),this.canvas.addEventListener(`webglcontextrestored`,()=>{this.lost=!1,this.init(),this.redrawAll(),this.kick()}),this.io=new IntersectionObserver(e=>{for(let t of e){let e=this.find(t.target);e&&(e.visible=t.isIntersecting)}this.kick()},{rootMargin:`64px`}),this.ro=new ResizeObserver(e=>{for(let t of e){let e=this.find(t.target);e&&this.measure(e)}this.redrawAll()}),this.mo=new MutationObserver(()=>this.redrawAll()),this.mo.observe(document.documentElement,{attributes:!0,attributeFilter:[`class`]}),window.addEventListener(`pointermove`,e=>this.pointer={x:e.clientX,y:e.clientY},{passive:!0}),document.documentElement.addEventListener(`pointerleave`,()=>this.pointer=null),document.fonts?.addEventListener(`loadingdone`,()=>{this.fontsVersion++,this.redrawAll()}),document.addEventListener(`visibilitychange`,()=>document.hidden?this.stop():this.kick())}static create(){let t=document.createElement(`canvas`),n=t.getContext(`webgl2`,{premultipliedAlpha:!0,antialias:!1,alpha:!0});return n?new e(t,n):null}init(){let e=this.gl,t=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader error`);return r},n=e.createProgram();if(e.attachShader(n,t(e.VERTEX_SHADER,i)),e.attachShader(n,t(e.FRAGMENT_SHADER,a)),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS))throw Error(e.getProgramInfoLog(n)??`link error`);e.useProgram(n),this.prog=n;let r=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let o=e.getAttribLocation(n,`aPos`);e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,0,0);let s=[`uSize`,`uPad`,`uRadius`,`uStroke`,`uRay`,`uRayLen`,`uAngle`,`uTime`,`uSweep`,`uHover`,`uIntro`,`uWaves`,`uFill`,`uBorder`,`uLab[0]`,`uInner`,`uOnLight`,`uMode`,`uRegion`,`uCast`,`uCastLen`];this.loc=Object.fromEntries(s.map(t=>[t,e.getUniformLocation(n,t)])),e.clearColor(0,0,0,0)}add(e,t,n){let r=t.getContext(`2d`);if(!r)return null;let i={el:e,out:t,ctx:r,opts:n,lab:{from:u(n.colors),to:u(n.colors)},labLight:{from:l(n.colors),to:l(n.colors)},paletteStart:0,w:0,h:0,bw:0,bh:0,visible:!0,cast:null,start:performance.now()/1e3,time:0,hover:0,follow:0,sweep:0};return this.items.add(i),this.measure(i),this.io.observe(e),this.ro.observe(e),this.draw(i,performance.now()/1e3),this.kick(),i}update(e,t){let n=performance.now()/1e3;t.colors.join()!==e.opts.colors.join()&&(e.lab={from:_(e.lab,e.paletteStart,n),to:u(t.colors)},e.labLight={from:_(e.labLight,e.paletteStart,n),to:l(t.colors)},e.paletteStart=this.reduceMotion?-1/0:n),e.opts=t,this.measure(e),this.draw(e,n),this.kick()}setCast(e,t){let n=t?.getContext(`2d`)??null;e.cast=t&&n?{out:t,ctx:n,bw:0,bh:0,mask:null,maskKey:``}:null,this.draw(e,performance.now()/1e3)}remove(e){this.items.delete(e),this.io.unobserve(e.el),this.ro.unobserve(e.el),this.items.size||this.stop()}find(e){for(let t of this.items)if(t.el===e)return t;return null}dpr(){return Math.min(window.devicePixelRatio||1,this.lowQuality?1.5:2)}measure(e){let t=e.el.getBoundingClientRect(),{pad:n}=e.opts;e.w=t.width,e.h=t.height;let r=this.dpr();e.bw=Math.max(1,Math.round((t.width+2*n)*r)),e.bh=Math.max(1,Math.round((t.height+2*n)*r)),e.out.style.width=`${t.width+2*n}px`,e.out.style.height=`${t.height+2*n}px`,(e.out.width!==e.bw||e.out.height!==e.bh)&&(e.out.width=e.bw,e.out.height=e.bh)}kick(){this.raf||this.lost||this.reduceMotion||document.hidden||!this.items.size||(this.last=performance.now(),this.due=0,this.raf=requestAnimationFrame(this.frame))}stop(){cancelAnimationFrame(this.raf),this.raf=0}frame=e=>{if(this.raf=0,this.due&&e<this.due-2){this.raf=requestAnimationFrame(this.frame);return}this.due=this.due&&e-this.due<h?this.due+h:e+h;let t=Math.min(.1,(e-this.last)/1e3);if(this.last=e,!this.lowQuality&&this.samples<120&&(this.sampleSum+=t,++this.samples===120&&this.sampleSum/120>.024)){this.lowQuality=!0;for(let e of this.items)this.measure(e)}let n=!1;for(let r of this.items)r.visible&&(n=!0,this.step(r,t),this.draw(r,e/1e3));n&&(this.raf=requestAnimationFrame(this.frame))};step(e,t){let n=e.el.getBoundingClientRect(),r=this.pointer,i=0,a=0,o=0;if(r){let t=r.x>=n.left&&r.x<=n.right&&r.y>=n.top&&r.y<=n.bottom;if(e.opts.hover&&t&&(i=1),e.opts.follow){let t=Math.max(n.left-r.x,0,r.x-n.right),i=Math.max(n.top-r.y,0,r.y-n.bottom),s=Math.min(1,Math.max(0,(Math.hypot(t,i)-40)/Math.max(1,e.opts.followRange-40)));a=e.opts.followStrength*(1-s*s*(3-2*s));let c=Math.max(1,n.width/2-e.opts.radius*1.4);o=Math.max(-1,Math.min(1,(r.x-(n.left+n.width/2))/c))}}e.hover=p(e.hover,i,6,t),e.follow=p(e.follow,a,1.2,t),e.time+=t*(1+e.opts.hoverSpeed*e.hover);let s=Math.sin(e.time*.55);e.sweep=p(e.sweep,s+(o-s)*e.follow,2.5,t)}redrawAll(){if(!this.lost)for(let e of this.items)this.measure(e),this.draw(e,performance.now()/1e3)}draw(e,t){if(this.lost||!this.prog||!e.w)return;let n=this.gl,r=this.loc,i=e.opts,a=document.documentElement.classList.contains(`dark`),o=this.reduceMotion;(this.canvas.width<e.bw||this.canvas.height<e.bh)&&(this.canvas.width=Math.max(this.canvas.width,e.bw),this.canvas.height=Math.max(this.canvas.height,e.bh)),n.viewport(0,0,e.bw,e.bh),n.clear(n.COLOR_BUFFER_BIT);let c=o?2.2:e.time,l=o?.12:d(c/i.period%1),u=o?1:f((t-e.start)/m);n.uniform2f(r.uSize,e.w,e.h),n.uniform1f(r.uPad,i.pad),n.uniform1f(r.uRadius,Math.min(i.radius,e.h/2,e.w/2)),n.uniform1f(r.uStroke,i.stroke),n.uniform1f(r.uRay,i.ray),n.uniform1f(r.uRayLen,i.rayLength),n.uniform1f(r.uAngle,l*Math.PI*2),n.uniform1f(r.uTime,c),n.uniform1f(r.uSweep,o?0:e.sweep),n.uniform1f(r.uHover,e.hover*(e.opts.hoverIntensity/.4)),n.uniform1f(r.uIntro,u),n.uniform1i(r.uWaves,this.lowQuality?4:7),n.uniform3fv(r.uFill,s(a?i.darkFill:i.fill)),n.uniform3fv(r.uBorder,s(a?i.darkBorder:i.border)),n.uniform3fv(r[`uLab[0]`],_(a?e.lab:e.labLight,e.paletteStart,t)),n.uniform1f(r.uOnLight,+!a),n.uniform1f(r.uInner,a?i.inner*1.25:i.inner),n.uniform1i(r.uMode,0),n.drawArrays(n.TRIANGLES,0,6),e.ctx.clearRect(0,0,e.bw,e.bh),e.ctx.drawImage(this.canvas,0,this.canvas.height-e.bh,e.bw,e.bh,0,0,e.bw,e.bh),e.cast&&this.drawCast(e,i,a)}drawCast(e,t,n){let r=this.gl,i=this.loc,a=e.cast,o=e.el.getBoundingClientRect(),s=a.out.getBoundingClientRect();if(!s.width||!s.height)return;let c=this.dpr(),l=Math.max(1,Math.round(s.width*c)),u=Math.max(1,Math.round(s.height*c));if((a.out.width!==l||a.out.height!==u)&&(a.out.width=l,a.out.height=u),a.bw=l,a.bh=u,t.cast<=0){a.ctx.clearRect(0,0,l,u);return}(this.canvas.width<l||this.canvas.height<u)&&(this.canvas.width=Math.max(this.canvas.width,l),this.canvas.height=Math.max(this.canvas.height,u));let d=o.left+o.width/2,f=o.top+o.height/2;r.viewport(0,0,l,u),r.clear(r.COLOR_BUFFER_BIT),r.uniform1i(i.uMode,1),r.uniform4f(i.uRegion,s.left-d,f-s.bottom,s.width,s.height),r.uniform1f(i.uCast,n?t.cast:t.cast*1.15),r.uniform1f(i.uCastLen,t.castLength),r.drawArrays(r.TRIANGLES,0,6),a.ctx.clearRect(0,0,l,u),a.ctx.drawImage(this.canvas,0,this.canvas.height-u,l,u,0,0,l,u);let p=`${l}x${u}@${c}:${a.out.parentElement?.textContent??``}:${this.fontsVersion}`;a.maskKey!==p&&(a.mask=y(a.out,s,c,l,u),a.maskKey=p),a.mask&&(a.ctx.globalCompositeOperation=`destination-in`,a.ctx.drawImage(a.mask,0,0),a.ctx.globalCompositeOperation=`source-over`)}};function y(e,t,n,r,i){let a=e.parentElement;if(!a)return null;let o=document.createElement(`canvas`);o.width=r,o.height=i;let s=o.getContext(`2d`);if(!s)return null;s.scale(n,n),s.fillStyle=`#000`,s.textBaseline=`alphabetic`;let c=document.createTreeWalker(a,NodeFilter.SHOW_TEXT),l=document.createRange();for(let e=c.nextNode();e;e=c.nextNode()){let n=e.textContent??``,r=e.parentElement;if(!r||!n.trim())continue;let i=getComputedStyle(r);s.font=`${i.fontStyle} ${i.fontWeight} ${i.fontSize} ${i.fontFamily}`,s.letterSpacing=i.letterSpacing===`normal`?`0px`:i.letterSpacing;for(let r of n.matchAll(/\S+/g)){l.setStart(e,r.index),l.setEnd(e,r.index+r[0].length);let n=l.getClientRects()[0];if(!n)continue;let i=s.measureText(r[0]).fontBoundingBoxAscent;s.fillText(r[0],n.left-t.left,n.top-t.top+i)}}return o}var b;function x(){if(b===void 0)try{b=v.create()}catch{b=null}return b}var S=n();(0,r.forwardRef)(function({children:e,className:t=``},n){return(0,S.jsxs)(`div`,{className:`relative ${t}`,children:[e,(0,S.jsx)(`canvas`,{ref:n,"aria-hidden":`true`,className:`pointer-events-none absolute inset-0 size-full`})]})});var C={stroke:1.5,radius:16,ray:.55,inner:.5,rayLength:11,pad:36,period:3.6,fill:`#fafafa`,darkFill:`#18181b`,border:`#e7e7e7`,darkBorder:`#2c2c31`,colors:[`#34c1b0`,`#2fb4d2`,`#3a9ef2`,`#5a82ea`,`#4a93ef`,`#2fbac7`],hover:!0,hoverIntensity:.4,hoverSpeed:.45,follow:!0,followStrength:.3,followRange:220,cast:.75,castLength:46};function w({children:e,className:t=``,castOn:n,...i}){let a=(0,r.useRef)(null),o=(0,r.useRef)(null),s=(0,r.useRef)(null),[c,l]=(0,r.useState)(!1),u={...C,...i},d=JSON.stringify(u);(0,r.useEffect)(()=>{let e=a.current,t=o.current;if(!e||!t)return;let r=x();if(!r){l(!0);return}let i=r.add(e,t,JSON.parse(d));return s.current=i,i&&n?.current&&r.setCast(i,n.current),()=>{i&&r.remove(i),s.current=null}},[]),(0,r.useEffect)(()=>{let e=x();e&&s.current&&e.update(s.current,JSON.parse(d))},[d]);let f=c?{border:`${u.stroke}px solid transparent`,borderRadius:u.radius,background:`linear-gradient(var(--badge-fill), var(--badge-fill)) padding-box, linear-gradient(90deg, ${u.colors.join(`, `)}) border-box`,boxShadow:`0 10px 22px -12px ${u.colors[2]}`,"--badge-fill":u.fill}:void 0;return(0,S.jsxs)(`div`,{ref:a,className:`relative inline-flex items-center justify-center ${c?`dark:[--badge-fill:#18181b]`:``} ${t}`,style:f,children:[!c&&(0,S.jsx)(`canvas`,{ref:o,"aria-hidden":`true`,className:`pointer-events-none absolute`,style:{left:-u.pad,top:-u.pad}}),(0,S.jsx)(`div`,{className:`relative`,children:e})]})}function T(){return(0,S.jsx)(w,{children:(0,S.jsx)(`span`,{className:`px-3 py-1 text-sm font-medium`,children:`New · Components 2.0`})})}export{T as default};